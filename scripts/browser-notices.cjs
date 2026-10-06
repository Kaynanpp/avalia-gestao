// Static license accompaniment for browser-delivered fonts and JS; not a feature.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const blocks = new Map();
function add(file, label, expectedHash) {
  const bytes = fs.readFileSync(file), hash = createHash('sha256').update(bytes).digest('hex');
  if (expectedHash && hash !== expectedHash) throw new Error('Upstream notice checksum mismatch: ' + file);
  if (!blocks.has(hash)) blocks.set(hash, { bytes, labels: [] });
  blocks.get(hash).labels.push(label);
}
for (const platform of ['win32-x64', 'linux-arm64']) {
  const file = 'docs/supply-chain/third-party-notices-' + platform + '.json';
  if (!fs.existsSync(file)) continue;
  const m = JSON.parse(fs.readFileSync(file));
  for (const pkg of m.packages) for (const n of pkg.notices) add(n.path, pkg.name + '@' + pkg.version + '/' + n.originalFile, n.sha256);
}
for (const file of ['Inter-OFL.txt', 'Firebase-JS-SDK-Apache-2.0.txt', 'Firebase-installed-copyrights.txt']) if (fs.existsSync('docs/third-party/' + file)) add('docs/third-party/' + file, file);
const supplementary = 'docs/supply-chain/supplementary-npm-notices.json';
if (fs.existsSync(supplementary)) for (const r of JSON.parse(fs.readFileSync(supplementary)).records) if (r.found) {
  add(r.path, r.name + '@' + r.version, r.sha256);
  if (r.declaration) {
    add(r.declaration, r.name + '@' + r.version + '/original upstream declaration');
    for (const file of fs.readdirSync(path.dirname(r.declaration)).filter(name => /^readme/i.test(name))) add(path.join(path.dirname(r.declaration), file), r.name + '@' + r.version + '/upstream README');
  }
}
fs.mkdirSync('public/legal', { recursive: true });
// Project grant is separate from original third-party notices.
for (const file of ['LICENSE', 'COPYRIGHT']) if (fs.existsSync(file)) fs.copyFileSync(file, 'public/legal/' + file + '.txt');
fs.copyFileSync('docs/third-party/Inter-OFL.txt', 'public/legal/Inter-OFL.txt');
const output = [Buffer.from('Third-party upstream notice collection. This does not license Avalia Gestão.\nScope: collected npm production notices and browser fonts. Native corresponding-source obligations remain separately documented.\n\n')];
for (const [hash, b] of blocks) output.push(Buffer.from('===== ' + b.labels.join('; ') + ' / SHA-256 ' + hash + ' =====\n'), b.bytes, Buffer.from('\n\n'));
fs.writeFileSync('public/legal/THIRD-PARTY-NOTICES.txt', Buffer.concat(output));
console.log(JSON.stringify({ uniqueUpstreamTexts: blocks.size, browserNoticeBytes: Buffer.concat(output).length }));
