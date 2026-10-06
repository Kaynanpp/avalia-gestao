const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'avalia-notices-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
test('notice collector preserves bundled subcomponent bytes and excludes nested dependency duplication', t => {
  const root = fixture(t);
  const write = (p, text) => { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), text); };
  write('package-lock.json', JSON.stringify({ packages: { 'node_modules/fixture': { version: '1.0.0', license: 'MIT' } } }));
  write('node_modules/fixture/LICENSE', 'public upstream fixture\r\n');
  write('node_modules/fixture/lib-vendor/part/LICENSE-MIT.txt', 'bundled public fixture\r\n');
  write('node_modules/fixture/node_modules/other/LICENSE', 'separate dependency fixture');
  execFileSync(process.execPath, [path.resolve('scripts/third-party-notices.cjs'), 'linux-arm64'], { cwd: root });
  const m = JSON.parse(fs.readFileSync(path.join(root, 'docs/supply-chain/third-party-notices-linux-arm64.json')));
  assert.equal(m.packages[0].notices.length, 2);
  for (const n of m.packages[0].notices) assert.deepEqual(fs.readFileSync(path.join(root, n.path)), fs.readFileSync(path.join(root, 'node_modules/fixture', n.originalFile)));
});
test('distribution inventory distinguishes npm dev modules from bundled Next build code', t => {
  const root = fixture(t);
  const base = path.join(root, '.next/standalone/node_modules/next');
  fs.mkdirSync(path.join(base, 'dist/compiled/@vercel/nft'), { recursive: true });
  fs.writeFileSync(path.join(base, 'package.json'), JSON.stringify({ name: 'next', version: '15.5.27' }));
  fs.writeFileSync(path.join(base, 'dist/compiled/@vercel/nft/index.js'), 'braces.compile=fixture;');
  execFileSync(process.execPath, [path.resolve('scripts/distribution-inventory.cjs')], { cwd: root });
  const m = JSON.parse(fs.readFileSync(path.join(root, 'docs/supply-chain/standalone-distribution.json')));
  assert.deepEqual(m.devModulesPresent, []);
  assert.equal(m.vendoredNextNft.containsBracesImplementation, true);
});
test('final Docker runner carries notices and manifests and does not define private build arguments', () => {
  const docker = fs.readFileSync('Dockerfile', 'utf8');
  assert.match(docker, /docs\/third-party/);
  assert.match(docker, /docs\/supply-chain/);
  assert.match(docker, /\/usr\/share\/common-licenses/);
  assert.match(docker, /USER node/);
  assert.doesNotMatch(docker, /ARG (?:PARTICIPATION_SECRET|FIREBASE_ADMIN_PRIVATE_KEY|BACKUP_ENCRYPTION_KEY)/);
  assert.match(docker, /process\.env\.PORT/);
});
test('installed SDK copyright blocks are preserved verbatim', t => {
  const root = fixture(t), folder = path.join(root, 'node_modules/@firebase/fixture/dist');
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify({ packages: { 'node_modules/@firebase/fixture': { version: '1.0.0' } } }));
  const block = '/** @license\r\n * Copyright 2026 fixture authors.\r\n */';
  fs.writeFileSync(path.join(folder, 'index.js'), block + '\nmodule.exports={};');
  execFileSync(process.execPath, [path.resolve('scripts/firebase-copyright-notices.cjs')], { cwd: root });
  assert.ok(fs.readFileSync(path.join(root, 'docs/third-party/Firebase-installed-copyrights.txt'), 'utf8').includes(block));
});
test('browser license accompaniment preserves bytes and refuses a missing referenced notice', t => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, 'docs/third-party'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs/supply-chain'), { recursive: true });
  const bytes = Buffer.from('font upstream fixture\r\n');
  fs.writeFileSync(path.join(root, 'docs/third-party/Inter-OFL.txt'), bytes);
  execFileSync(process.execPath, [path.resolve('scripts/browser-notices.cjs')], { cwd: root });
  assert.deepEqual(fs.readFileSync(path.join(root, 'public/legal/Inter-OFL.txt')), bytes);
  fs.writeFileSync(path.join(root, 'docs/supply-chain/third-party-notices-linux-arm64.json'), JSON.stringify({ packages: [{ name: 'fixture', version: '1.0.0', notices: [{ path: 'missing.txt' }] }] }));
  assert.throws(() => execFileSync(process.execPath, [path.resolve('scripts/browser-notices.cjs')], { cwd: root, stdio: 'pipe' }));
});

test('release source package preserves upstream non-UTF8 notice bytes', t => {
  const root = fixture(t), artifact = path.join(root, 'candidate');
  fs.writeFileSync(path.join(root, '.gitattributes'), 'docs/third-party/** -text\npublic/legal/** -text\n');
  const bytes = Buffer.from([0x43, 0x6f, 0xff, 0x0d, 0x0a]);
  for (const folder of ['docs/third-party', 'public/legal']) {
    fs.mkdirSync(path.join(root, folder), { recursive: true });
    fs.writeFileSync(path.join(root, folder, 'LICENSE.txt'), bytes);
  }
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  git('init'); git('add', '.');
  git('-c', 'user.name=Notice fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'Synthetic notices');
  execFileSync(process.execPath, [path.resolve('scripts/release-artifact.cjs'), 'create', artifact], { cwd: root });
  for (const folder of ['docs/third-party', 'public/legal']) assert.deepEqual(fs.readFileSync(path.join(artifact, folder, 'LICENSE.txt')), bytes);
});
