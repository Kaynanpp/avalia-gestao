const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { allowed, generic, verify, hash } = require('../../scripts/release-artifact.cjs');
test('reconstruction excludes private data, company assets and operational reports', () => {
  for (const file of ['.env.local', '.env.pi', '.private/backup.json', 'artifacts/result.json', 'public/brand/atalaia-mark.png', 'docs/WORKLOG.md', 'docs/PROJECT-DIAGNOSIS.md']) assert.equal(allowed(file), false);
  for (const file of ['.env.example', 'src/app/page.tsx', 'Dockerfile', 'firestore.rules', 'LICENSE', 'COPYRIGHT', 'CLA.md', 'AUTHORS.md', 'COMMERCIAL-LICENSE.md', 'TRADEMARKS.md', 'CODE_OF_CONDUCT.md']) assert.equal(allowed(file), true);
});
test('generic package defaults do not alter private installation defaults', () => {
  assert.equal(generic('Dockerfile', 'ARG NEXT_PUBLIC_COMPANY_BRAND=atalaia'), 'ARG NEXT_PUBLIC_COMPANY_BRAND=generic');
  assert.equal(generic('src/lib/product.ts', "process.env.NEXT_PUBLIC_COMPANY_BRAND === 'generic'"), "process.env.NEXT_PUBLIC_COMPANY_BRAND !== 'atalaia'");
});
test('reconstruction integrity refuses tampering, unsafe paths and extra files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avalia-artifact-test-'));
  try {
    fs.writeFileSync(path.join(dir, 'README.md'), 'fixture');
    const manifest = { format: 'avalia-reconstruction-v1', files: [{ path: 'README.md', sha256: hash(Buffer.from('fixture')) }] };
    const write = () => fs.writeFileSync(path.join(dir, 'release-manifest.json'), JSON.stringify(manifest));
    write(); assert.equal(verify(dir).files.length, 1);
    fs.writeFileSync(path.join(dir, 'extra.txt'), 'fixture'); assert.throws(() => verify(dir), /extra/); fs.unlinkSync(path.join(dir, 'extra.txt'));
    fs.writeFileSync(path.join(dir, 'README.md'), 'changed'); assert.throws(() => verify(dir), /Integridade/);
    manifest.files[0].path = '../README.md'; write(); assert.throws(() => verify(dir), /Caminho/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
