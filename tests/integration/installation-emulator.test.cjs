const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const base = process.env.TEST_APP_URL;
if (!base || new URL(base).hostname !== '127.0.0.1' || !/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '') || !/^127\.0\.0\.1:\d+$/.test(process.env.FIREBASE_AUTH_EMULATOR_HOST || '')) throw new Error('Instalação permitida somente em laboratório local.');
async function call(route, body, cookie) {
  return fetch(base + route, { method: body === undefined ? 'GET' : 'POST', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(120000) });
}
async function login(email, password) {
  const response = await call('/api/admin/login', { email, password }); assert.equal(response.status, 200); return response.headers.get('set-cookie').split(';')[0];
}
test('clean documented bootstrap, first password change, ADMIN and RH access work without private files', { timeout: 300000 }, async (t) => {
  const app = initializeApp({ projectId: 'demo-avalia-gestao' }, 'installation-test'); t.after(() => deleteApp(app));
  const db = getFirestore(app), auth = getAuth(app);
  assert.equal((await db.listCollections()).length, 0, 'Use destino vazio.');
  assert.equal((await auth.listUsers(1)).users.length, 0);
  const env = { ...process.env, BOOTSTRAP_ADMIN_ALLOW: 'true', BOOTSTRAP_ADMIN_EMAIL: 'install-admin@example.invalid', BOOTSTRAP_ADMIN_NAME: 'ADMIN fictício', BOOTSTRAP_ADMIN_PASSWORD: 'InstallOnly1!' };
  const bootstrap = spawnSync(process.execPath, ['scripts/bootstrap-admin.cjs'], { env, encoding: 'utf8', timeout: 120000 });
  assert.equal(bootstrap.status, 0, 'Bootstrap falhou; saída privada não exibida.');
  const admin = await auth.getUserByEmail(env.BOOTSTRAP_ADMIN_EMAIL);
  assert.equal((await db.collection('users').doc(admin.uid).get()).data().mustChangePassword, true);
  assert.equal(spawnSync(process.execPath, ['scripts/bootstrap-admin.cjs'], { env, encoding: 'utf8', timeout: 120000 }).status, 1, 'Segundo bootstrap deve recusar.');
  let cookie = await login(env.BOOTSTRAP_ADMIN_EMAIL, env.BOOTSTRAP_ADMIN_PASSWORD);
  assert.equal((await call('/api/admin/usuarios', undefined, cookie)).status, 403);
  assert.equal((await call('/api/admin/conta/senha', { currentPassword: env.BOOTSTRAP_ADMIN_PASSWORD, newPassword: 'InstalledAdmin2!' }, cookie)).status, 200);
  cookie = await login(env.BOOTSTRAP_ADMIN_EMAIL, 'InstalledAdmin2!');
  assert.equal((await call('/api/admin/usuarios', undefined, cookie)).status, 200);
  const created = await call('/api/admin/usuarios', { email: 'install-rh@example.invalid', name: 'RH fictício', role: 'RH' }, cookie);
  assert.equal(created.status, 201); const result = await created.json();
  let rhCookie = await login('install-rh@example.invalid', result.temporaryPassword);
  assert.equal((await call('/api/admin/conta/senha', { currentPassword: result.temporaryPassword, newPassword: 'InstalledRh2!' }, rhCookie)).status, 200);
  rhCookie = await login('install-rh@example.invalid', 'InstalledRh2!');
  assert.equal((await call('/api/admin/usuarios', undefined, rhCookie)).status, 403);
  assert.equal((await call('/api/periodos', undefined, rhCookie)).status, 200);
  assert.equal((await call('/api/admin/logout', {}, rhCookie)).status, 200);
  assert.equal((await call('/api/health')).status, 200);
  // A compiled production server deliberately fails readiness with emulators.
  // Do not weaken the application's production guard to make a lab pass.
  assert.equal((await call('/api/ready')).status, process.env.NODE_ENV === 'production' ? 503 : 200);
});
