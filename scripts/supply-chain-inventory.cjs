const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const lockBytes = fs.readFileSync('package-lock.json');
const lock = JSON.parse(lockBytes);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const entries = Object.entries(lock.packages).filter(([key, pkg]) => key && !pkg.dev);
const components = [];
const evidence = [];
for (const [key, pkg] of entries.sort(([a], [b]) => a.localeCompare(b))) {
  const name = pkg.name || key.slice(key.lastIndexOf('node_modules/') + 13);
  const licenseFiles = [];
  if (fs.existsSync(key)) for (const file of fs.readdirSync(key)) {
    if (!/^(?:LICENSE|LICENCE|COPYING|NOTICE)(?:[._-]|$)/i.test(file) || !fs.statSync(path.join(key, file)).isFile()) continue;
    const bytes = fs.readFileSync(path.join(key, file));
    licenseFiles.push({ file, sha256: sha(bytes) });
  }
  let reported = pkg.license || 'UNKNOWN';
  let observation = licenseFiles.length ? 'arquivo local identificado; revisão humana necessária' : 'arquivo não instalado/localizado nesta plataforma';
  if (name === 'limiter' && pkg.version === '1.1.5' && licenseFiles.some(({ file }) => /LICENSE/i.test(file))) {
    const text = fs.readFileSync(path.join(key, licenseFiles.find(({ file }) => /LICENSE/i.test(file)).file), 'utf8');
    if (text.includes('Permission is hereby granted, free of charge') && text.includes('THE SOFTWARE IS PROVIDED')) { reported = 'MIT'; observation = 'MIT identificado em LICENSE.txt; lockfile não declara'; }
  }
  const component = { type: 'library', name, version: pkg.version, 'bom-ref': key, purl: `pkg:npm/${name.startsWith('@') ? '%40' + name.slice(1) : name}@${pkg.version}`, properties: [{ name: 'avalia:lockfilePath', value: key }, { name: 'avalia:licenseEvidence', value: observation }] };
  if (reported !== 'UNKNOWN' && reported !== 'MIT/X11') component.licenses = [{ expression: reported }];
  else component.properties.push({ name: 'avalia:licenseReported', value: reported });
  if (pkg.integrity?.startsWith('sha512-')) component.hashes = [{ alg: 'SHA-512', content: Buffer.from(pkg.integrity.slice(7), 'base64').toString('hex') }];
  components.push(component);
  evidence.push({ name, version: pkg.version, path: key, declared: pkg.license || 'UNKNOWN', reviewed: reported, observation, files: licenseFiles });
}
const manifest = { format: 'avalia-license-evidence-v1', lockfileSha256: sha(lockBytes), productionPackages: entries.length, evidence };
fs.mkdirSync('docs/supply-chain', { recursive: true });
fs.writeFileSync('docs/supply-chain/license-evidence.json', JSON.stringify(manifest, null, 2) + '\n');
const projectLicense = require('../package.json').license;
const root = { type: 'application', name: lock.name, version: lock.version, 'bom-ref': 'avalia-gestao', properties: [{ name: 'avalia:licenseStatus', value: projectLicense ? 'OWNER-APPROVED' : 'PENDING' }] };
if (projectLicense) root.licenses = [{ expression: projectLicense }];
fs.writeFileSync('docs/supply-chain/bom.cdx.json', JSON.stringify({ bomFormat: 'CycloneDX', specVersion: '1.6', version: 1, metadata: { component: root, properties: [{ name: 'avalia:scope', value: 'production lockfile inventory including optional platforms; no runtime reachability claim' }, { name: 'avalia:lockfileSha256', value: sha(lockBytes) }] }, components }, null, 2) + '\n');
const counts = {};
for (const entry of evidence) counts[entry.reviewed] = (counts[entry.reviewed] || 0) + 1;
// Human review notes must survive regeneration of machine-readable evidence.
if (!fs.existsSync('docs/DEPENDENCY-LICENSES.md')) {
fs.writeFileSync('docs/DEPENDENCY-LICENSES.md', '# Dependências e licenças — evidência técnica\n\nGerado pelo lockfile e arquivos LICENSE/NOTICE disponíveis nesta plataforma. Não é parecer jurídico. Inclui pacotes opcionais de outras plataformas; ausência de arquivo local exige inspeção na instalação Linux limpa. Uma licença da aplicação não relicencia dependências.\n\nLockfile SHA-256: `' + sha(lockBytes) + '`. ' + entries.length + ' entradas de produção.\n\n| Licença/expressão | Entradas |\n| --- | --- |\n' + Object.entries(counts).sort().map(([license, count]) => `| ${license} | ${count} |`).join('\n') + '\n\n## Revisão necessária\n\n- limiter 1.1.5: lockfile omite licença; LICENSE.txt local contém MIT. Conservar esse aviso.\n- traverse: metadado histórico MIT/X11; conferir texto real no Linux antes de normalizar para MIT.\n- jszip: alternativa MIT OR GPL-3.0-or-later; distribuição comercial deve registrar opção compatível e manter avisos.\n- pako: MIT AND Zlib, cumprir ambas; victory-vendor: MIT AND ISC, conservar ambos.\n- BlueOak-1.0.0, Apache-2.0, BSD, ISC, 0BSD e demais permissivas exigem seus termos/avisos; Apache pode ter NOTICE.\n- sharp/libvips e módulos nativos: inventariar licenças dos binários efetivamente distribuídos e do sistema base; o SBOM npm não cobre automaticamente bibliotecas C ou Debian.\n- Inter é obtida por next/font no build: conservar sua SIL OFL e copyright; não atribuir autoria da fonte ao produto.\n- Firebase/Google Cloud são serviços externos com termos próprios; não fazem parte da licença do código.\n\nNenhuma incompatibilidade impeditiva foi comprovada por este inventário; também não foi certificada compatibilidade AGPL/comercial. Revisar titularidade/contribuições e direitos para licença alternativa, além dos avisos de terceiros. Campos desconhecidos ou binários sem evidência são pendências.\n\n## Reproduzir\n\n```sh\nnpm ci\nnode scripts/license-inventory.cjs\nnode scripts/supply-chain-inventory.cjs\n```\n\n[SBOM CycloneDX 1.6](supply-chain/bom.cdx.json) e [hashes dos avisos encontrados](supply-chain/license-evidence.json). SBOM é inventário de componentes do lockfile, sem grafo transitivo/serviços/SO; não deve ser chamado de SBOM completo da imagem. Não inclui secrets ou dados de clientes.\n');
}
console.log(JSON.stringify({ productionPackages: entries.length, evidenceFiles: evidence.reduce((n, entry) => n + entry.files.length, 0), unknownLicenses: evidence.filter((entry) => entry.reviewed === 'UNKNOWN').length }));
