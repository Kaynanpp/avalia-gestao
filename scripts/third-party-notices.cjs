// Copies verified upstream notice files, without applying a license to this product.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const platform = process.argv[2] || process.platform + '-' + process.arch;
if (!/^(linux-arm64|linux-x64|win32-x64|win32-arm64)$/.test(platform)) throw new Error('Unsupported notice platform');
const bytes = fs.readFileSync('package-lock.json'), lock = JSON.parse(bytes);
const sha = b => createHash('sha256').update(b).digest('hex');
const entries = [];
for (const [key, pkg] of Object.entries(lock.packages).filter(([k, p]) => k && !p.dev).sort(([a], [b]) => a.localeCompare(b))) {
  const name = pkg.name || key.slice(key.lastIndexOf('node_modules/') + 13);
  const entry = { name, version: pkg.version, packagePath: key, declared: pkg.license || 'UNKNOWN', installed: fs.existsSync(key), notices: [] };
  function noticeFiles(directory, prefix = '', depth = 0) {
    if (depth > 8) return [];
    const results = [];
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      if (item.isSymbolicLink()) continue;
      const relative = prefix + item.name;
      if (item.isDirectory()) {
        if (!['node_modules', '.git', 'test', 'tests', 'coverage'].includes(item.name)) results.push(...noticeFiles(path.join(directory, item.name), relative + '/', depth + 1));
      } else if (item.isFile() && /^(LICENSE|LICENCE|COPYING|NOTICE)([._-]|$)/i.test(item.name)) results.push(relative);
    }
    return results;
  }
  if (entry.installed) for (const file of noticeFiles(key)) {
    const original = path.join(key, file);
    if (!fs.statSync(original).isFile()) continue;
    const content = fs.readFileSync(original);
    const slug = key.replace(/^node_modules\//, '').replace(/[^a-zA-Z0-9._-]/g, '_') + '-' + pkg.version;
    const destination = path.posix.join('docs/third-party/packages', platform, slug, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content);
    entry.notices.push({ originalFile: file, path: destination, sha256: sha(content), bytes: content.length });
  }
  entries.push(entry);
}
const result = { format: 'avalia-third-party-notices-v1', platform, lockfileSha256: sha(bytes), scope: 'Installed production npm root and bundled subcomponent notice files; no nested node_modules duplication; not complete OS/native source compliance', packages: entries };
fs.mkdirSync('docs/supply-chain', { recursive: true });
fs.writeFileSync('docs/supply-chain/third-party-notices-' + platform + '.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ platform, packages: entries.length, installed: entries.filter(e => e.installed).length, copiedNotices: entries.reduce((n, e) => n + e.notices.length, 0), installedWithoutNotice: entries.filter(e => e.installed && !e.notices.length).length }));
