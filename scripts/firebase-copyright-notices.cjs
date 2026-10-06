// Preserve copyright/license comments from the installed SDK, never user data.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const lock = JSON.parse(fs.readFileSync('package-lock.json'));
const blocks = new Map();
for (const [key, pkg] of Object.entries(lock.packages)) {
  if (!key.startsWith('node_modules/@firebase/') || pkg.dev || !fs.existsSync(key)) continue;
  function walk(dir, depth = 0) {
    if (depth > 10) return;
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (item.isSymbolicLink()) continue;
      const file = path.join(dir, item.name);
      if (item.isDirectory()) { if (!['node_modules', '.git', 'tests'].includes(item.name)) walk(file, depth + 1); }
      else if (/\.(?:js|mjs|ts)$/.test(item.name) && fs.statSync(file).size < 32 * 1024 * 1024) {
        const content = fs.readFileSync(file, 'utf8');
        for (const match of content.matchAll(/\/\*[\s\S]*?\*\//g)) {
          if (!/@license|Copyright|SPDX-License-Identifier/i.test(match[0])) continue;
          const sha = createHash('sha256').update(match[0]).digest('hex');
          if (!blocks.has(sha)) blocks.set(sha, { text: match[0], sources: [] });
          blocks.get(sha).sources.push({ packagePath: key, version: pkg.version, file: path.relative(key, file).replaceAll('\\', '/') });
        }
      }
    }
  }
  walk(key);
}
fs.mkdirSync('docs/third-party', { recursive: true });
fs.mkdirSync('docs/supply-chain', { recursive: true });
fs.writeFileSync('docs/third-party/Firebase-installed-copyrights.txt', [...blocks].map(([sha, entry]) => `===== Original installed SDK comment SHA-256 ${sha} =====\n${entry.text}\n`).join('\n'));
fs.writeFileSync('docs/supply-chain/firebase-copyright-evidence.json', JSON.stringify({ scope: 'Unmodified installed SDK comment blocks; full SDK license supplied separately', blocks: [...blocks].map(([sha256, entry]) => ({ sha256, sources: entry.sources })) }, null, 2) + '\n');
console.log(JSON.stringify({ preservedBlocks: blocks.size }));
