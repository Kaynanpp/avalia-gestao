// Cloud restoration is intentionally separate from the emulator-only utility.
// This module accepts only an explicit, synthetic, two-project laboratory.
const { digest, decode } = require('./portable-backup.cjs');

function validateLab(config, sourceCredential, destinationCredential, environment = process.env) {
  const ids = [config?.sourceProjectId, config?.destinationProjectId];
  if (config?.syntheticOnly !== true || ids.some((id) => typeof id !== 'string' || !/^avalia-dr-(src|dst)-[a-z0-9-]{5,}$/.test(id)) || ids[0] === ids[1]) throw new Error('Laboratório sintético separado obrigatório.');
  if (!Array.isArray(config.allowedProjectIds) || config.allowedProjectIds.length !== 2 || new Set(config.allowedProjectIds).size !== 2 || ids.some((id) => !config.allowedProjectIds.includes(id))) throw new Error('Allowlist explícita dos dois laboratórios obrigatória.');
  if (sourceCredential?.project_id !== ids[0] || destinationCredential?.project_id !== ids[1]) throw new Error('Credencial não pertence ao laboratório confirmado.');
  if (environment.FIRESTORE_EMULATOR_HOST || environment.FIREBASE_AUTH_EMULATOR_HOST || environment.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') throw new Error('Não misturar cloud com emuladores.');
  return ids;
}

function importRecords(users) {
  const seen = new Set();
  return users.map((user) => {
    if (!user.uid || seen.has(user.uid) || user.multiFactor?.enrolledFactors?.length) throw new Error('UID duplicado/inválido ou MFA não suportado.');
    seen.add(user.uid);
    if (user.providerData?.some((provider) => provider.providerId === 'password') && (!user.passwordHash || !user.passwordSalt)) throw new Error('Exportação sem hash/salt recuperável.');
    const record = { uid: user.uid };
    for (const field of ['email', 'emailVerified', 'displayName', 'photoURL', 'phoneNumber', 'disabled', 'customClaims', 'providerData']) if (user[field] !== undefined) record[field] = user[field];
    if (user.metadata) record.metadata = { creationTime: user.metadata.creationTime, lastSignInTime: user.metadata.lastSignInTime };
    if (user.passwordHash) record.passwordHash = Buffer.from(user.passwordHash, 'base64');
    if (user.passwordSalt) record.passwordSalt = Buffer.from(user.passwordSalt, 'base64');
    return record;
  });
}

async function restoreLab({ config, sourceCredential, destinationCredential, db, auth, payload, hashConfig }) {
  const [sourceId, destinationId] = validateLab(config, sourceCredential, destinationCredential);
  if (db.projectId !== destinationId || auth.app.options.projectId !== destinationId || payload.projectId !== sourceId) throw new Error('Projeto divergente; restauração recusada.');
  if (payload.version !== 1 || digest(payload.documents) !== payload.documentDigest || digest(payload.users) !== payload.userDigest) throw new Error('Integridade do backup inválida.');
  if (!Array.isArray(payload.documents) || payload.documents.length > 5000 || payload.users.length > 1000) throw new Error('Ensaio excede limite sintético.');
  if (hashConfig?.algorithm !== 'SCRYPT' || !hashConfig.signerKey || hashConfig.rounds === undefined || hashConfig.memoryCost === undefined) throw new Error('Parâmetros originais SCRYPT obrigatórios.');
  const records = importRecords(payload.users);
  if ((await db.listCollections()).length || (await auth.listUsers(1)).users.length) throw new Error('Destino precisa estar vazio; nenhum dado será sobrescrito.');
  const authStart = Date.now();
  const result = await auth.importUsers(records, { hash: { algorithm: 'SCRYPT', key: Buffer.from(hashConfig.signerKey, 'base64'), saltSeparator: Buffer.from(hashConfig.saltSeparator || '', 'base64'), rounds: Number(hashConfig.rounds), memoryCost: Number(hashConfig.memoryCost) } });
  if (result.failureCount || result.successCount !== records.length) throw new Error('Importação Auth incompleta; inspecione somente o laboratório.');
  const authRestoreMs = Date.now() - authStart, firestoreStart = Date.now();
  for (let offset = 0; offset < payload.documents.length; offset += 400) {
    const batch = db.batch();
    for (const entry of payload.documents.slice(offset, offset + 400)) batch.set(db.doc(entry.path), decode(entry.data, db));
    await batch.commit();
  }
  return { users: result.successCount, documents: payload.documents.length, authRestoreMs, firestoreRestoreMs: Date.now() - firestoreStart };
}

module.exports = { validateLab, importRecords, restoreLab };
