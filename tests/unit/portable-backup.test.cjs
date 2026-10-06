const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { Timestamp, GeoPoint } = require('firebase-admin/firestore');
const { encode, decode, seal, unseal, digest, restoreEmptyEmulator } = require('../../scripts/portable-backup.cjs');
test('portable backup preserves nested maps without reserved marker collisions', () => {
  const value = { type: 'timestamp', value: [null, false, { name: 'fixture' }] };
  assert.deepEqual(decode(encode(value), {}), value);
});
test('portable backup fails closed for unsupported custom value types', () => {
  class Unsupported { constructor() { this.values = [1, 2]; } }
  assert.throws(() => encode(new Unsupported()), /não suportado/);
});
test('portable backup preserves timestamps at nanosecond precision', () => {
  const value = new Timestamp(1730000000, 123456789);
  assert.ok(decode(encode(value), {}).isEqual(value));
});
test('portable backup preserves bytes, geopoints and exceptional numbers', () => {
  const value = { bytes: Buffer.from('fixture'), point: new GeoPoint(-20, -45), nan: NaN, infinity: Infinity };
  const restored = decode(encode(value), {});
  assert.deepEqual(restored.bytes, value.bytes);
  assert.ok(restored.point.isEqual(value.point));
  assert.ok(Number.isNaN(restored.nan));
  assert.equal(restored.infinity, Infinity);
});
test('portable backup encrypts content and authenticates correct key', () => {
  const key = randomBytes(32), documents = [{ path: 'fixture/one', data: encode({ private: 'example.invalid' }) }], users = [];
  const payload = { version: 1, documents, users, documentDigest: digest(documents), userDigest: digest(users) };
  const encrypted = seal(payload, key);
  assert.ok(!encrypted.includes('example.invalid'));
  assert.deepEqual(unseal(encrypted, key), payload);
  assert.throws(() => unseal(encrypted, randomBytes(32)));
});
test('portable backup rejects changed ciphertext and an inconsistent manifest', () => {
  const key = randomBytes(32), documents = [], users = [];
  const encrypted = JSON.parse(seal({ version: 1, documents, users, documentDigest: digest(documents), userDigest: digest(users) }, key));
  encrypted.content = 'AAAA' + encrypted.content.slice(4);
  assert.throws(() => unseal(JSON.stringify(encrypted), key));
  assert.throws(() => unseal(seal({ version: 1, documents, users, documentDigest: 'wrong', userDigest: digest(users) }, key), key));
});
test('portable restore refuses non-demo projects before any write', async () => {
  const original = [process.env.FIRESTORE_EMULATOR_HOST, process.env.FIREBASE_AUTH_EMULATOR_HOST];
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  try { await assert.rejects(() => restoreEmptyEmulator({ projectId: 'real-project' }, {}, { users: [] }), /demo-/); }
  finally { for (const [i, name] of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST'].entries()) { if (original[i] === undefined) delete process.env[name]; else process.env[name] = original[i]; } }
});
test('portable restore refuses occupied destinations before any write', async () => {
  const original = [process.env.FIRESTORE_EMULATOR_HOST, process.env.FIREBASE_AUTH_EMULATOR_HOST];
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  try { await assert.rejects(() => restoreEmptyEmulator({ projectId: 'demo-test', listCollections: async () => [{}] }, {}, { users: [] }), /vazio/); }
  finally { for (const [i, name] of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST'].entries()) { if (original[i] === undefined) delete process.env[name]; else process.env[name] = original[i]; } }
});
