// Records the files actually traced into the server, including vendored build code.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(process.argv[2] || '.next/standalone');
const sha = b => createHash('sha256').update(b).digest('hex');
const modules = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.isSymbolicLink()) continue;
    const file = path.join(dir, item.name);
    if (item.isDirectory()) walk(file);
    else if (item.name === 'package.json') {
      try { const p = JSON.parse(fs.readFileSync(file)); if (p.name && p.version) modules.push({ name: p.name, version: p.version, path: path.relative(root, file).replaceAll('\\', '/') }); } catch {}
    }
  }
}
walk(root);
const bundled = path.join(root, 'node_modules/next/dist/compiled/@vercel/nft/index.js');
const result = { format: 'avalia-distribution-inventory-v1', scope: 'Traced standalone files, not proof of runtime reachability', modules: modules.sort((a, b) => a.path.localeCompare(b.path)), devModulesPresent: ['braces', '@opentelemetry/core', 'firebase-tools', 'eslint', 'tailwindcss'].filter(name => modules.some(p => p.name === name)), vendoredNextNft: { present: fs.existsSync(bundled), sha256: fs.existsSync(bundled) ? sha(fs.readFileSync(bundled)) : null, containsBracesImplementation: fs.existsSync(bundled) && fs.readFileSync(bundled, 'utf8').includes('braces.compile=') } };
fs.mkdirSync('docs/supply-chain', { recursive: true });
fs.writeFileSync('docs/supply-chain/standalone-distribution.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ tracedModules: modules.length, devModulesPresent: result.devModulesPresent, vendoredNextNft: result.vendoredNextNft }));
