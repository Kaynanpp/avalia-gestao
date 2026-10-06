const fs = require('node:fs');
const path = require('node:path');
const guides = require('../src/content/public-guides.json');
const destination = path.resolve(__dirname, '../docs/public');
fs.mkdirSync(destination, { recursive: true });
for (const guide of guides) {
  const text = `# ${guide.title}\n\n${guide.summary}\n\n## Procedimento\n\n${guide.steps.map((step, i) => `${i + 1}. ${step}`).join('\n\n')}\n${guide.commands ? `\n## Comandos de referência\n\n\`\`\`sh\n${guide.commands}\n\`\`\`\n` : ''}\n## Antes de prosseguir\n\n${guide.note}\n`;
  fs.writeFileSync(path.join(destination, `${guide.slug}.md`), text);
}
fs.writeFileSync(path.join(destination, 'README.md'), '# Documentação pública\n\nGuias gerados da mesma fonte utilizada pelo site, sem infraestrutura privada.\n\n' + guides.map((guide) => `- [${guide.title}](${guide.slug}.md)`).join('\n') + '\n\nRegenerar: `node scripts/generate-public-docs.cjs`. Operações privadas ficam fora do Git em `.private/`.\n');
console.log(`${guides.length} guias públicos gerados.`);
