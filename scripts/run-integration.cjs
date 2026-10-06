const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const { createConnection } = require('node:net');
const localHost = (value) => /^127\.0\.0\.1:\d+$/.test(value || '');
if (!localHost(process.env.FIRESTORE_EMULATOR_HOST) || !localHost(process.env.FIREBASE_AUTH_EMULATOR_HOST)) {
  throw new Error('Execute pelo Firebase emulators:exec com Auth e Firestore locais.');
}
const root = path.resolve(__dirname, '..');
const env = {
  ...process.env,
  NODE_ENV: process.argv.includes('--production') ? 'production' : 'development',
  SITE_MODE: 'dedicated',
  PRODUCT_INDEXING_ENABLED: 'false',
  NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PUBLIC_USE_FIREBASE_EMULATOR: 'true',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-avalia-gestao',
  FIREBASE_ADMIN_PROJECT_ID: 'demo-avalia-gestao',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'localhost',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000',
  NEXT_PUBLIC_FIREBASE_APP_ID: 'demo',
  NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3006',
  NEXT_PUBLIC_AUTH_EMULATOR_HOST: '127.0.0.1',
  NEXT_PUBLIC_AUTH_EMULATOR_PORT: process.env.FIREBASE_AUTH_EMULATOR_HOST.split(':')[1],
  NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: '127.0.0.1',
  NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT: process.env.FIRESTORE_EMULATOR_HOST.split(':')[1],
  PARTICIPATION_SECRET: 'integration-only-secret-with-at-least-32-characters',
  PARTICIPATION_PREVIOUS_SECRETS: '',
  RATE_LIMIT_SECRET: '',
  TRUST_PROXY: 'false',
  TEST_APP_URL: 'http://127.0.0.1:3006',
  FIREBASE_ADMIN_PRIVATE_KEY: '',
  FIREBASE_ADMIN_CLIENT_EMAIL: '',
  GOOGLE_APPLICATION_CREDENTIALS: '',
  PRODUCT_SITE_URL: '',
  PRODUCT_SUPPORT_EMAIL: '',
  PRODUCT_REPOSITORY_URL: '',
  PRODUCT_APPLICATION_URL: '',
  PRODUCT_DOCUMENTATION_URL: '',
};

async function main() {
  // Never attach to an unrelated process on the chosen port.
  const occupied = await new Promise((resolve) => {
    const connection = createConnection({ host: '127.0.0.1', port: 3006 });
    connection.once('connect', () => { connection.destroy(); resolve(true); });
    connection.once('error', () => resolve(false));
    connection.setTimeout(1000, () => { connection.destroy(); resolve(false); });
  });
  if (occupied) throw new Error('A porta 3006 já está em uso. Encerre o servidor de teste anterior.');
  const serverArgs = process.argv.includes('--production') ? [path.join(root, '.next/standalone/server.js')] : [require.resolve('next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '3006'];
  const server = spawn(process.execPath, serverArgs, { cwd: root, env: { ...env, HOSTNAME: '127.0.0.1', PORT: '3006' }, stdio: 'inherit', detached: process.platform !== 'win32' });
  let ended = false;
  server.on('exit', () => { ended = true; });
  try {
    const deadline = Date.now() + 180000;
    let ready = false;
    while (!ready && Date.now() < deadline && !ended) {
      try { ready = (await fetch(`${env.TEST_APP_URL}/api/health`, { signal: AbortSignal.timeout(15000) })).ok; } catch {}
      if (!ready) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!ready) throw new Error('O servidor de integração não iniciou dentro do prazo.');
    const result = await new Promise((resolve, reject) => {
      const suite = process.argv.includes('--recovery') ? 'tests/integration/recovery-emulator.test.cjs' : process.argv.includes('--installation') ? 'tests/integration/installation-emulator.test.cjs' : 'tests/integration/api-emulator.test.cjs';
      const child = spawn(process.execPath, ['--test', suite], { cwd: root, env, stdio: 'inherit' });
      child.on('error', reject);
      child.on('exit', (code) => resolve(code ?? 1));
    });
    process.exitCode = result;
  } finally {
    if (!ended) {
      if (process.platform === 'win32') spawnSync('taskkill.exe', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
      else { try { process.kill(-server.pid, 'SIGTERM'); } catch {} }
    }
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
