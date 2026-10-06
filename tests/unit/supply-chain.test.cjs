const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
test('SBOM uses CycloneDX metadata and covers every production lockfile entry', () => {
  const lock = JSON.parse(fs.readFileSync('package-lock.json'));
  const bom = JSON.parse(fs.readFileSync('docs/supply-chain/bom.cdx.json'));
  assert.equal(bom.bomFormat, 'CycloneDX'); assert.equal(bom.specVersion, '1.6');
  assert.equal(bom.metadata.component.version, lock.version);
  const expected = Object.entries(lock.packages).filter(([key, pkg]) => key && !pkg.dev).map(([key]) => key).sort();
  assert.deepEqual(bom.components.map((entry) => entry['bom-ref']).sort(), expected);
  assert.equal(new Set(bom.components.map((entry) => entry['bom-ref'])).size, expected.length);
  for (const entry of bom.components) { assert.equal(entry.type, 'library'); assert.ok(entry.name); assert.ok(entry.version); assert.match(entry.purl, /^pkg:npm\//); }
});
test('license evidence binds to lockfile and does not invent unknown license or public approval', () => {
  const evidence = JSON.parse(fs.readFileSync('docs/supply-chain/license-evidence.json'));
  assert.equal(evidence.lockfileSha256, createHash('sha256').update(fs.readFileSync('package-lock.json')).digest('hex'));
  assert.equal(evidence.evidence.some((entry) => entry.name === 'buffers'), false);
  assert.equal(evidence.evidence.find((entry) => entry.name === 'limiter').reviewed, 'MIT');
  const bom = JSON.parse(fs.readFileSync('docs/supply-chain/bom.cdx.json'));
  assert.ok(bom.metadata.component.properties.some((entry) => entry.value === 'OWNER-APPROVED'));
  assert.deepEqual(bom.metadata.component.licenses, [{ expression: 'AGPL-3.0-only' }]);
  assert.equal(JSON.parse(fs.readFileSync('package.json')).license, 'AGPL-3.0-only');
});
