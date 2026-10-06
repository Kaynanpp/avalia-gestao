const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateLab, importRecords, restoreLab } = require('../../scripts/firebase-lab-recovery.cjs');
const { digest } = require('../../scripts/portable-backup.cjs');
const sourceProjectId = 'avalia-dr-src-synthetic', destinationProjectId = 'avalia-dr-dst-synthetic';
const config = { syntheticOnly: true, sourceProjectId, destinationProjectId, allowedProjectIds: [sourceProjectId, destinationProjectId] };
const sourceCredential = { project_id: sourceProjectId }, destinationCredential = { project_id: destinationProjectId };
test('lab guard permits only confirmed separate synthetic projects and matching credentials', () => {
  assert.deepEqual(validateLab(config, sourceCredential, destinationCredential, {}), [sourceProjectId, destinationProjectId]);
  for (const invalid of [{ ...config, syntheticOnly: false }, { ...config, sourceProjectId: 'customer-production' }, { ...config, destinationProjectId: sourceProjectId }, { ...config, allowedProjectIds: [sourceProjectId] }, { ...config, allowedProjectIds: [sourceProjectId, sourceProjectId] }]) assert.throws(() => validateLab(invalid, sourceCredential, destinationCredential, {}));
  assert.throws(() => validateLab(config, sourceCredential, { project_id: 'customer-production' }, {}));
});
test('cloud lab rejects emulator variables', () => {
  for (const environment of [{ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }, { FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' }, { NEXT_PUBLIC_USE_FIREBASE_EMULATOR: 'true' }]) assert.throws(() => validateLab(config, sourceCredential, destinationCredential, environment));
});
test('Auth imports preserve UID, claims and hash bytes without copying session metadata', () => {
  const [record] = importRecords([{ uid: 'synthetic-admin', email: 'admin@example.invalid', customClaims: { role: 'ADMIN' }, passwordHash: Buffer.from('synthetic-hash').toString('base64'), passwordSalt: Buffer.from('synthetic-salt').toString('base64'), tokensValidAfterTime: 'not-portable', metadata: { creationTime: 'date', lastSignInTime: 'date', lastRefreshTime: 'not-portable' } }]);
  assert.equal(record.uid, 'synthetic-admin'); assert.equal(record.customClaims.role, 'ADMIN'); assert.equal(record.passwordHash.toString(), 'synthetic-hash'); assert.equal(record.tokensValidAfterTime, undefined); assert.equal(record.metadata.lastRefreshTime, undefined);
});
test('Auth imports refuse duplicate UID, missing password hash and unsupported MFA', () => {
  assert.throws(() => importRecords([{ uid: 'a' }, { uid: 'a' }]));
  assert.throws(() => importRecords([{ uid: 'a', providerData: [{ providerId: 'password' }] }]));
  assert.throws(() => importRecords([{ uid: 'a', multiFactor: { enrolledFactors: [{}] } }]));
});
test('cloud lab refuses nonempty target before any writes', async () => {
  const documents = [], users = [{ uid: 'synthetic' }], payload = { version: 1, projectId: sourceProjectId, documents, users, documentDigest: digest(documents), userDigest: digest(users) };
  let writes = 0;
  const db = { projectId: destinationProjectId, listCollections: async () => ['existing'], batch: () => { writes++; } };
  const auth = { app: { options: { projectId: destinationProjectId } }, listUsers: async () => ({ users: [] }), importUsers: async () => { writes++; } };
  await assert.rejects(() => restoreLab({ config, sourceCredential, destinationCredential, db, auth, payload, hashConfig: { algorithm: 'SCRYPT', signerKey: 'c3ludGhldGlj', rounds: 8, memoryCost: 14 } }), /vazio/);
  assert.equal(writes, 0);
});
