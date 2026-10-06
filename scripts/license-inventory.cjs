const fs = require('node:fs');
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const rows = Object.entries(lock.packages).filter(([name, pkg]) => name && !pkg.dev).map(([name, pkg]) => [name.replace(/^node_modules\//,''), pkg.version || '', pkg.license || 'NÃO DECLARADA']).sort((a,b) => a[0].localeCompare(b[0]));
fs.writeFileSync('docs/THIRD-PARTY-LICENSES.md', '# Inventário de dependências de produção\n\nGerado do package-lock.json. Campo license é informativo e não certifica compatibilidade jurídica. Antes de distribuir, conservar LICENSE/NOTICE reais e revisar termos das dependências e serviços.\n\n| Pacote | Versão | Licença declarada |\n| --- | --- | --- |\n' + rows.map(row => '| ' + row.join(' | ') + ' |').join('\n') + '\n');
console.log(rows.length + ' registros de dependências de produção inventariados.');
