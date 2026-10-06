const { execFileSync } = require('node:child_process');
const git = process.env.GIT_EXECUTABLE || 'git';
const indicators = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /AIza[0-9A-Za-z_-]{35}/];
function inspect(content, file) {
  if (/check-git-secrets\.cjs$/.test(file)) return false;
  if (['.env.example', '.env.pi.example'].includes(file)) {
    content = content.split('\n').filter((line) => !/^(?:FIREBASE_ADMIN_PRIVATE_KEY|PARTICIPATION_SECRET)=.*(?:YOUR_PRIVATE_KEY|COLE_A_CHAVE_PRIVADA_AQUI|generate_at_least_32_random_characters_and_keep_stable|gere_um_segredo_aleatorio_com_pelo_menos_32_caracteres)/.test(line)).join('\n');
  }
  const assignments = [...content.matchAll(/^(?:export[ \t]+)?(?:PARTICIPATION_SECRET|PARTICIPATION_PREVIOUS_SECRETS|RATE_LIMIT_SECRET|BOOTSTRAP_ADMIN_PASSWORD|BACKUP_ENCRYPTION_KEY|AUTH_HASH_KEY)[ \t]*=[ \t]*(.+)$/gm)];
  return assignments.some((match) => match[1].trim().replace(/^(['"])(.*)\1$/, '$2').length > 0) || indicators.some((indicator) => indicator.test(content));
}
function main() {
  const commits = execFileSync(git, ['rev-list', '--all'], { encoding: 'utf8' }).trim().split(/\s+/).filter(Boolean);
  const objects = new Map();
  for (const commit of commits) {
    const entries = execFileSync(git, ['ls-tree', '-r', '-z', commit], { encoding: 'utf8' }).split('\0');
    for (const entry of entries) {
      const match = entry.match(/^\d+ blob ([a-f0-9]+)\t([\s\S]+)$/);
      if (!match) continue;
      if (!objects.has(match[1])) objects.set(match[1], []);
      objects.get(match[1]).push({ commit, file: match[2] });
    }
  }
  let findings = 0;
  if (objects.size) {
    const output = execFileSync(git, ['cat-file', '--batch'], { input: [...objects.keys()].join('\n') + '\n', maxBuffer: 256 * 1024 * 1024 });
    let offset = 0;
    for (const [id, references] of objects) {
      const end = output.indexOf(10, offset);
      const header = output.subarray(offset, end).toString('ascii').match(/^([a-f0-9]+) blob (\d+)$/);
      if (!header || header[1] !== id) throw new Error('Formato de objeto inesperado.');
      const size = Number(header[2]);
      const bytes = output.subarray(end + 1, end + 1 + size);
      offset = end + 1 + size + 1;
      if (bytes.includes(0)) continue;
      const content = bytes.toString('utf8');
      for (const { commit, file } of references) if (inspect(content, file)) {
        findings++;
        console.error(`Revisar ${commit.slice(0, 8)}:${file} (conteúdo omitido)`);
      }
    }
  }
  console.log(`${commits.length} commits inspecionados; ${findings} arquivos com indicadores. Valores nunca exibidos.`);
  console.log('Inspeção heurística de texto: revisar manualmente dados pessoais, anexos/binários e segredos de outros formatos.');
  process.exitCode = findings ? 1 : 0;
}
try { main(); } catch {
  console.error('Não foi possível concluir a inspeção do histórico. Nenhum conteúdo de arquivo foi exibido.');
  process.exitCode = 1;
}
