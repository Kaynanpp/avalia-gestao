// Publication review prints only paths/categories, never matched values.
const { execFileSync } = require('node:child_process');
const git = process.env.GIT_EXECUTABLE || 'git';
try {
  const commits = execFileSync(git, ['rev-list', '--all'], { encoding: 'utf8' }).trim().split(/\s+/).filter(Boolean);
  const objects = new Map();
  for (const commit of commits) for (const entry of execFileSync(git, ['ls-tree', '-r', '-z', commit], { encoding: 'utf8' }).split('\0')) {
    const match = entry.match(/^\d+ blob ([a-f0-9]+)\t([\s\S]+)$/);
    if (!match) continue;
    if (!objects.has(match[1])) objects.set(match[1], []);
    objects.get(match[1]).push({ commit, file: match[2] });
  }
  const data = execFileSync(git, ['cat-file', '--batch'], { input: [...objects.keys()].join('\n') + '\n', maxBuffer: 100 * 1024 * 1024 });
  const findings = new Map();
  let offset = 0;
  const report = (category, references) => {
    for (const { commit, file } of references) {
      const label = `${category}: ${file}`;
      if (!findings.has(label)) findings.set(label, new Set());
      findings.get(label).add(commit.slice(0, 8));
    }
  };
  for (const [id, references] of objects) {
    const end = data.indexOf(10, offset);
    const header = data.subarray(offset, end).toString('ascii').match(/^([a-f0-9]+) blob (\d+)$/);
    if (!header || header[1] !== id) throw new Error('Objeto inválido.');
    const size = Number(header[2]), bytes = data.subarray(end + 1, end + 1 + size);
    offset = end + 1 + size + 1;
    report('asset de empresa requer revisão de direitos', references.filter(({ file }) => /^public\/brand\/atalaia-/.test(file)));
    report('arquivo privado/backup/certificado requer revisão', references.filter(({ file }) => /(?:^|\/)(?:\.env(?:\.|$)|.*\.(?:pem|pfx|p12|key|backup|dump|tgz|zip)$)/.test(file) && !['.env.example', '.env.pi.example'].includes(file)));
    if (bytes.includes(0)) continue;
    const text = bytes.toString('utf8');
    const eligible = references.filter(({ file }) => !file.endsWith('check-public-history.cjs'));
    if (/\b10\.(?:\d{1,3}\.){2}\d{1,3}\b|avaliagestao-rh-prd-\d+/.test(text)) report('identificador de infraestrutura privada', eligible);
    if (/\b[A-Za-z0-9._+-]+@(?:gmail|hotmail|outlook)\.com\b/i.test(text)) report('contato pessoal requer revisão', eligible);
    if (/[A-Za-z]:[\\/]Users[\\/](?!EXEMPLO|USUARIO|USER)[^\\/\s]+[\\/]/i.test(text)) report('caminho de computador pessoal', eligible);
  }
  for (const [label, references] of findings) console.log(`${label} (${references.size} commits; exemplos ${[...references].slice(0, 3).join(', ')})`);
  console.log(`${commits.length} commits; ${findings.size} itens de revisão pré-publicação. Conteúdos omitidos. Não substitui revisão humana.`);
  process.exitCode = findings.size ? 1 : 0;
} catch { console.error('Revisão não concluída; nenhum conteúdo sensível exibido.'); process.exitCode = 1; }
