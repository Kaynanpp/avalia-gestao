// Encrypted logical backup. Restoration deliberately supports only empty local emulators.
const { createCipheriv, createDecipheriv, randomBytes, createHash } = require('node:crypto');
const fs = require('node:fs');
const { initializeApp, deleteApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, GeoPoint } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

function encode(value) {
  if (value instanceof Date) return encode(Timestamp.fromDate(value));
  if (value instanceof Timestamp) return { type: 'timestamp', seconds: value.seconds, nanos: value.nanoseconds };
  if (value instanceof GeoPoint) return { type: 'geo', latitude: value.latitude, longitude: value.longitude };
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return { type: 'bytes', value: Buffer.from(value).toString('base64') };
  if (value && typeof value.path === 'string' && typeof value.get === 'function') return { type: 'reference', path: value.path };
  if (Array.isArray(value)) return { type: 'array', value: value.map(encode) };
  if (value && typeof value === 'object') {
    if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error('Tipo Firestore não suportado pelo backup lógico.');
    return { type: 'map', value: Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encode(entry)])) };
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return { type: 'number', value: String(value) };
  return { type: 'scalar', value };
}
function decode(value, db) {
  switch (value.type) {
    case 'timestamp': return new Timestamp(value.seconds, value.nanos);
    case 'geo': return new GeoPoint(value.latitude, value.longitude);
    case 'bytes': return Buffer.from(value.value, 'base64');
    case 'reference': return db.doc(value.path);
    case 'array': return value.value.map((entry) => decode(entry, db));
    case 'map': return Object.fromEntries(Object.entries(value.value).map(([key, entry]) => [key, decode(entry, db)]));
    case 'number': return Number(value.value);
    case 'scalar': return value.value;
    default: throw new Error('Tipo de backup desconhecido.');
  }
}
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function keyFromEnvironment() {
  const value = process.env.BACKUP_ENCRYPTION_KEY || '';
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new Error('Defina BACKUP_ENCRYPTION_KEY: 32 bytes aleatórios em base64.');
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) throw new Error('Chave de backup inválida.');
  return key;
}
function seal(payload, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('avalia-gestao-backup-v1'));
  const content = Buffer.concat([cipher.update(JSON.stringify(payload)), cipher.final()]);
  return JSON.stringify({ format: 'avalia-gestao-backup-v1', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), content: content.toString('base64') });
}
function unseal(text, key) {
  const envelope = JSON.parse(text);
  if (envelope.format !== 'avalia-gestao-backup-v1') throw new Error('Formato de backup incompatível.');
  const cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  cipher.setAAD(Buffer.from(envelope.format));
  cipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  const payload = JSON.parse(Buffer.concat([cipher.update(Buffer.from(envelope.content, 'base64')), cipher.final()]).toString());
  if (payload.version !== 1 || digest(payload.documents) !== payload.documentDigest || digest(payload.users) !== payload.userDigest) throw new Error('Integridade do backup inválida.');
  return payload;
}
async function capture(db, auth, projectId) {
  const documents = [];
  async function walk(collection) {
    // listDocuments includes missing parent documents that still contain subcollections.
    for (const ref of await collection.listDocuments()) {
      const snapshot = await ref.get();
      if (snapshot.exists) documents.push({ path: ref.path, data: encode(snapshot.data()) });
      for (const child of await ref.listCollections()) await walk(child);
    }
  }
  for (const collection of await db.listCollections()) await walk(collection);
  documents.sort((a, b) => a.path.localeCompare(b.path));
  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users.map((user) => user.toJSON()));
    pageToken = page.pageToken;
  } while (pageToken);
  users.sort((a, b) => a.uid.localeCompare(b.uid));
  return { version: 1, projectId, capturedAt: new Date().toISOString(), documents, users, documentDigest: digest(documents), userDigest: digest(users) };
}
async function restoreEmptyEmulator(db, auth, payload) {
  if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '') || !/^127\.0\.0\.1:\d+$/.test(process.env.FIREBASE_AUTH_EMULATOR_HOST || '')) throw new Error('Restauração permitida somente em emuladores locais explícitos.');
  if (!db.projectId.startsWith('demo-')) throw new Error('Projeto de restauração precisa ser demo-*.');
  if (payload.users.some((user) => user.multiFactor?.enrolledFactors?.length)) throw new Error('Restauração MFA não suportada pelo backup lógico; use procedimento Auth gerenciado.');
  if ((await db.listCollections()).length || (await auth.listUsers(1)).users.length) throw new Error('Destino precisa estar vazio; nenhum dado será sobrescrito.');
  const productionSource = !payload.projectId.startsWith('demo-');
  if (productionSource && payload.users.some((user) => user.passwordHash) && (!process.env.AUTH_HASH_KEY || !process.env.AUTH_HASH_SALT_SEPARATOR || !process.env.AUTH_HASH_ROUNDS || !process.env.AUTH_HASH_MEMORY_COST)) throw new Error('Parâmetros originais de hash Auth necessários antes de restaurar.');
  for (let offset = 0; offset < payload.documents.length; offset += 400) {
    const batch = db.batch();
    for (const entry of payload.documents.slice(offset, offset + 400)) batch.set(db.doc(entry.path), decode(entry.data, db));
    await batch.commit();
  }
  const hashKey = process.env.AUTH_HASH_KEY;
  const saltSeparator = process.env.AUTH_HASH_SALT_SEPARATOR;
  if (!productionSource) {
    // Auth Emulator exports fakeHash/fakeSalt as raw strings, unlike production
    // base64 hashes. SDK importUsers re-encodes them and breaks password login.
    // Preserve the emulator export representation through its LOCAL admin API.
    for (let offset = 0; offset < payload.users.length; offset += 1000) {
      const users = payload.users.slice(offset, offset + 1000).map((user) => ({
        localId: user.uid, email: user.email, emailVerified: user.emailVerified,
        displayName: user.displayName, photoUrl: user.photoURL, disabled: user.disabled,
        phoneNumber: user.phoneNumber, passwordHash: user.passwordHash, salt: user.passwordSalt,
        customAttributes: user.customClaims ? JSON.stringify(user.customClaims) : undefined,
        createdAt: user.metadata?.creationTime ? String(new Date(user.metadata.creationTime).getTime()) : undefined,
        providerUserInfo: (user.providerData || []).map(({ uid, photoURL, ...provider }) => ({ ...provider, rawId: uid, photoUrl: photoURL })),
      }));
      const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(db.projectId)}/accounts:batchCreate`, { method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ users }), signal: AbortSignal.timeout(30000) });
      const result = await response.json();
      if (!response.ok || result.error?.length || result.error?.message) throw new Error('Falha de restauração Auth local.');
    }
    return;
  }
  for (let offset = 0; offset < payload.users.length; offset += 1000) {
    const users = payload.users.slice(offset, offset + 1000).map((user) => {
      const { passwordHash, passwordSalt, ...rest } = user;
      return { ...rest, ...(passwordHash ? { passwordHash: Buffer.from(passwordHash, 'base64') } : {}), ...(passwordSalt ? { passwordSalt: Buffer.from(passwordSalt, 'base64') } : {}) };
    });
    // Emulator password hashes are deliberately not production SCRYPT hashes.
    if (productionSource && users.some((user) => user.passwordHash) && (!hashKey || !saltSeparator || !process.env.AUTH_HASH_ROUNDS || !process.env.AUTH_HASH_MEMORY_COST)) throw new Error('Parâmetros originais de hash Auth necessários; não será prometida recuperação de senhas sem eles.');
    const result = await auth.importUsers(users, { hash: { algorithm: 'SCRYPT', key: Buffer.from(hashKey || '', 'base64'), saltSeparator: Buffer.from(saltSeparator || '', 'base64'), rounds: Number(process.env.AUTH_HASH_ROUNDS), memoryCost: Number(process.env.AUTH_HASH_MEMORY_COST) } });
    if (result.failureCount) throw new Error('Falha de importação Auth; destino isolado precisa ser inspecionado.');
  }
}
async function main() {
  const [operation, projectId, file, permission] = process.argv.slice(2);
  if (!['export', 'restore'].includes(operation) || !projectId || !file) throw new Error('Uso: portable-backup.cjs export|restore PROJETO ARQUIVO [--allow-cloud-read]');
  const local = /^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '') && /^127\.0\.0\.1:\d+$/.test(process.env.FIREBASE_AUTH_EMULATOR_HOST || '');
  if ((!local && operation !== 'export') || (local && !projectId.startsWith('demo-'))) throw new Error('Destino de restauração deve ser demo-* em emuladores locais.');
  if (!local && (permission !== '--allow-cloud-read' || process.env.FIREBASE_ADMIN_PROJECT_ID !== projectId || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST)) throw new Error('Leitura cloud exige projeto confirmado e --allow-cloud-read.');
  const key = keyFromEnvironment();
  const app = initializeApp({ projectId, ...(!local ? { credential: cert({ projectId, clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL, privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n') }) } : {}) }, 'portable-backup');
  const start = Date.now();
  try {
    const db = getFirestore(app), auth = getAuth(app);
    let payload;
    if (operation === 'export') {
      payload = await capture(db, auth, projectId);
      if (!local && payload.users.some((user) => user.providerData?.some((provider) => provider.providerId === 'password') && !user.passwordHash)) throw new Error('Export Auth sem hashes recuperáveis; confira permissão de leitura de hash.');
      fs.writeFileSync(file, seal(payload, key), { flag: 'wx', mode: 0o600 });
    } else {
      payload = unseal(fs.readFileSync(file, 'utf8'), key);
      await restoreEmptyEmulator(db, auth, payload);
      const check = await capture(db, auth, projectId);
      if (check.documentDigest !== payload.documentDigest || check.users.length !== payload.users.length) throw new Error('Verificação posterior à restauração falhou.');
    }
    console.log(JSON.stringify({ operation, documents: payload.documents.length, users: payload.users.length, durationMs: Date.now() - start }));
  } finally { await deleteApp(app); }
}
module.exports = { encode, decode, seal, unseal, capture, restoreEmptyEmulator, digest };
if (require.main === module) main().catch(() => { console.error('Backup/restore falhou. Confira projeto, destino vazio, permissões, chave e parâmetros Auth; nenhum conteúdo sensível foi registrado.'); process.exitCode = 1; });
