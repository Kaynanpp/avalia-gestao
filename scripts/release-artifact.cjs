// A reconstruction source package, never a customer-data backup or publication.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const excludedDocs = new Set(['docs/WORKLOG.md', 'docs/PROJECT-DIAGNOSIS.md', 'docs/PREPUBLICATION-REVIEW.md']);
function allowed(file) {
  if (file === 'THIRD_PARTY_NOTICES.md') return true;
  if (/^public\/brand\/atalaia-/.test(file) || excludedDocs.has(file)) return false;
  if (/^(?:src|scripts|tests|docs|public|\.github)\//.test(file)) return !/(?:^|\/)(?:\.private|artifacts|node_modules)\//.test(file);
  return ['LICENSE', 'COPYRIGHT', 'AUTHORS.md', 'CLA.md', 'CODE_OF_CONDUCT.md', 'TRADEMARKS.md', 'COMMERCIAL-LICENSE.md', 'README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md', 'ROADMAP.md', 'package.json', 'package-lock.json', 'Dockerfile', 'docker-compose.yml', '.dockerignore', '.gitignore', '.gitattributes', '.env.example', '.env.pi.example', '.firebaserc', 'firebase.json', 'firebase.recovery.json', 'firestore.rules', 'firestore.indexes.json', 'next.config.js', 'next.config.mjs', 'next-env.d.ts', 'tsconfig.json', 'tsconfig.seed.json', 'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js', 'postcss.config.mjs', '.eslintrc.json', 'components.json', 'jest.config.js', 'jest.config.ts'].includes(file);
}
function generic(file, text) {
  if (file === 'src/lib/product.ts') return text.replace(/process\.env\.NEXT_PUBLIC_COMPANY_BRAND === 'generic'/g, "process.env.NEXT_PUBLIC_COMPANY_BRAND !== 'atalaia'");
  if (file === 'Dockerfile') return text.replace('ARG NEXT_PUBLIC_COMPANY_BRAND=atalaia', 'ARG NEXT_PUBLIC_COMPANY_BRAND=generic').replace('ARG NEXT_PUBLIC_COMPANY_NAME=Atalaia Alimentos', 'ARG NEXT_PUBLIC_COMPANY_NAME=Sua empresa');
  if (file === 'docker-compose.yml') return text.replace('${NEXT_PUBLIC_COMPANY_BRAND:-atalaia}', '${NEXT_PUBLIC_COMPANY_BRAND:-generic}').replace('${NEXT_PUBLIC_COMPANY_NAME:-Atalaia Alimentos}', '${NEXT_PUBLIC_COMPANY_NAME:-Sua empresa}');
  return text;
}
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function verify(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'release-manifest.json')));
  if (manifest.format !== 'avalia-reconstruction-v1') throw new Error('Manifesto incompatível.');
  const expected = new Set(manifest.files.map((entry) => entry.path));
  for (const entry of manifest.files) {
    if (!allowed(entry.path) || entry.path.includes('..') || path.isAbsolute(entry.path)) throw new Error('Caminho não permitido.');
    const target = path.join(root, entry.path);
    if (fs.lstatSync(target).isSymbolicLink() || hash(fs.readFileSync(target)) !== entry.sha256) throw new Error('Integridade inválida.');
  }
  function walk(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = prefix + entry.name;
      if (file === '.git') continue;
      if (entry.isSymbolicLink()) throw new Error('Link não permitido.');
      if (entry.isDirectory()) walk(path.join(dir, entry.name), file + '/');
      else if (file !== 'release-manifest.json' && !expected.has(file)) throw new Error('Arquivo extra no pacote.');
    }
  }
  walk(root);
  return manifest;
}
function main() {
  const [operation, directory] = process.argv.slice(2);
  if (!directory || !['create', 'verify'].includes(operation)) throw new Error('Uso: release-artifact.cjs create|verify DIRETORIO');
  const root = path.resolve(directory);
  if (operation === 'verify') { const manifest = verify(root); console.log(JSON.stringify({ verified: true, files: manifest.files.length, version: manifest.version })); return; }
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
  if (git('status', '--porcelain').trim()) throw new Error('Commitar alterações antes de empacotar.');
  if (fs.existsSync(root)) throw new Error('Destino precisa ser novo; nenhum arquivo será sobrescrito.');
  const revision = git('rev-parse', 'HEAD').trim();
  const entries = git('ls-tree', '-r', '-z', revision).split('\0').map((entry) => entry.match(/^\d+ blob ([a-f0-9]+)\t([\s\S]+)$/)).filter(Boolean).map((entry) => ({ id: entry[1], file: entry[2] })).filter(({ file }) => allowed(file)).sort((a, b) => a.file.localeCompare(b.file));
  const objects = execFileSync('git', ['cat-file', '--batch'], { input: entries.map(({ id }) => id).join('\n') + '\n', maxBuffer: 100 * 1024 * 1024 });
  fs.mkdirSync(root, { recursive: true });
  const manifest = { format: 'avalia-reconstruction-v1', version: require('../package.json').version, sourceCommit: revision, edition: 'community-source-local-candidate', license: require('../package.json').license || 'PENDING-NOT-FOR-PUBLIC-DISTRIBUTION', publication: 'NOT-PUBLISHED', thirdPartyLicenses: 'Preserved separately; see THIRD_PARTY_NOTICES.md', dataIncluded: false, secretsIncluded: false, configuration: 'examples-only', platform: 'Linux 64-bit / Node 24 / Docker', transforms: ['remove company assets and operational documents', 'generic branding defaults'], files: [] };
  let offset = 0;
  for (const { id, file } of entries) {
    const end = objects.indexOf(10, offset);
    const header = objects.subarray(offset, end).toString('ascii').match(/^([a-f0-9]+) blob (\d+)$/);
    if (!header || header[1] !== id) throw new Error('Objeto inválido.');
    const size = Number(header[2]);
    let bytes = objects.subarray(end + 1, end + 1 + size);
    offset = end + 1 + size + 1;
    // Upstream notices may use another encoding; preserve their original bytes.
    if (!bytes.includes(0) && !file.startsWith('docs/third-party/') && !file.startsWith('public/legal/')) bytes = Buffer.from(generic(file, bytes.toString('utf8')));
    const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes, { flag: 'wx' });
    manifest.files.push({ path: file, sha256: hash(bytes), bytes: bytes.length });
  }
  fs.writeFileSync(path.join(root, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  verify(root);
  console.log(JSON.stringify({ created: true, files: manifest.files.length, version: manifest.version, sourceCommit: revision }));
}
module.exports = { allowed, generic, verify, hash };
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
