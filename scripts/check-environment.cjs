const fs = require('node:fs');
const path = require('node:path');

function parseEnvFile(file) {
  const values = {};
  const content = fs.readFileSync(file, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const requestedFile = process.argv[2];
const file = requestedFile ? path.resolve(requestedFile) : null;
if (file && !fs.existsSync(file)) {
  console.error('Arquivo de ambiente não encontrado.');
  process.exit(1);
}
const env = file ? { ...process.env, ...parseEnvFile(file) } : process.env;
const production = file?.endsWith('.env.pi') || env.NODE_ENV === 'production';
const errors = [];

const siteMode = env.SITE_MODE || 'dedicated';
if (!['dedicated', 'institutional'].includes(siteMode)) {
  console.error('SITE_MODE precisa ser dedicated ou institutional.');
  process.exit(1);
}
if (siteMode === 'institutional') {
  if (env.FIREBASE_ADMIN_PRIVATE_KEY || env.FIREBASE_ADMIN_CLIENT_EMAIL) errors.push('A instalação institucional não deve receber credenciais administrativas Firebase.');
  if (env.PRODUCT_INDEXING_ENABLED === 'true') {
    try {
      const siteUrl = new URL(env.PRODUCT_SITE_URL || '');
      if (siteUrl.protocol !== 'https:' || siteUrl.username || siteUrl.password || siteUrl.search || siteUrl.hash) throw new Error();
    } catch { errors.push('Indexação pública exige PRODUCT_SITE_URL HTTPS válida.'); }
  }
  if (errors.length) { errors.forEach((error) => console.error(error)); process.exit(1); }
  console.log('Configuração institucional válida, sem credenciais Firebase. Publicação/indexação dependem de autorização.');
  process.exit(0);
}

let required = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_APP_URL',
  'FIREBASE_ADMIN_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY',
  'PARTICIPATION_SECRET',
];
if (!production && env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  required = required.filter((key) => !['FIREBASE_ADMIN_CLIENT_EMAIL', 'FIREBASE_ADMIN_PRIVATE_KEY'].includes(key));
}
if (production) required.push('SITE_BIND_IP', 'SITE_APP_PORT');

for (const key of required) {
  if (!env[key]?.trim()) errors.push(`${key} não foi preenchido.`);
}

const placeholder = /your_|seu-projeto|xxxxx|COLE_|generate_|gere_um|CHAVE_PRIVADA/i;
for (const key of required) {
  if (env[key] && placeholder.test(env[key])) errors.push(`${key} ainda contém um valor de exemplo.`);
}

if ((env.PARTICIPATION_SECRET || '').trim().length < 32) {
  errors.push('PARTICIPATION_SECRET precisa ter pelo menos 32 caracteres.');
}
if (env.RATE_LIMIT_SECRET && env.RATE_LIMIT_SECRET.trim().length < 32) {
  errors.push('RATE_LIMIT_SECRET precisa ter pelo menos 32 caracteres quando informado.');
}
if ((env.PARTICIPATION_PREVIOUS_SECRETS || '').split(',').map((value) => value.trim()).filter(Boolean).some((value) => value.length < 32)) {
  errors.push('PARTICIPATION_PREVIOUS_SECRETS contém segredo anterior inválido.');
}
if (env.FIREBASE_ADMIN_PROJECT_ID && env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && env.FIREBASE_ADMIN_PROJECT_ID !== env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  errors.push('Os IDs de projeto Firebase do navegador e do servidor precisam ser iguais.');
}
if (production && env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  errors.push('O emulador do Firebase não pode estar habilitado na instalação de produção.');
}
try {
  const url = new URL(env.NEXT_PUBLIC_APP_URL || '');
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  if (url.protocol === 'https:' && env.TRUST_PROXY !== 'true') {
    errors.push('TRUST_PROXY deve ser true quando HTTPS termina no proxy reverso recomendado.');
  }
} catch {
  errors.push('NEXT_PUBLIC_APP_URL precisa ser uma URL HTTP ou HTTPS válida.');
}
if (env.TRUST_PROXY === 'true' && !production) {
  errors.push('TRUST_PROXY deve ficar false no desenvolvimento sem proxy confiável.');
}

if (errors.length) {
  console.error('Configuração inválida:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Configuração válida. Nenhum segredo foi exibido.');
