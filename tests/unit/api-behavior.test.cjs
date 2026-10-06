const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const root = path.resolve(__dirname, '../..');

test('institutional mode exposes only product pages and liveness, blocking application and mutation APIs', async () => {
  const saved = process.env.SITE_MODE;
  process.env.SITE_MODE = 'institutional';
  try {
    const { middleware } = load('src/middleware.ts');
    for (const route of ['/admin/login', '/avaliar', '/api/avaliacoes', '/api/admin/usuarios']) assert.equal(middleware(new NextRequest(`http://localhost${route}`)).status, 404);
    assert.equal(middleware(new NextRequest('http://localhost/produto')).status, 200);
    assert.equal(middleware(new NextRequest('http://localhost/api/health')).status, 200);
    assert.ok(middleware(new NextRequest('http://localhost/')).headers.get('x-middleware-rewrite').endsWith('/produto'));
    process.env.SITE_MODE = 'invalid-mode';
    assert.equal(middleware(new NextRequest('http://localhost/api/health')).status, 503);
  } finally { if (saved === undefined) delete process.env.SITE_MODE; else process.env.SITE_MODE = saved; }
});

function load(file, mocks = {}, cache = new Map()) {
  let absolute = path.resolve(root, file);
  if (!fs.existsSync(absolute) && absolute.endsWith('.ts')) {
    absolute = path.join(absolute.slice(0, -3), 'index.ts');
  }
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const module = { exports: {} };
  cache.set(absolute, module);
  const js = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const localRequire = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, mocks, cache);
    if (name.startsWith('.')) {
      if (name.endsWith('.json')) return require(path.resolve(path.dirname(absolute), name));
      const relative = path.relative(root, path.resolve(path.dirname(absolute), name));
      return load(`${relative}.ts`, mocks, cache);
    }
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`, { filename: absolute })(localRequire, module, module.exports);
  return module.exports;
}

function fakeDatabase() {
  const records = new Map();
  let queue = Promise.resolve();
  return {
    records,
    collection(name) {
      return { doc(id) { return {
        key: `${name}/${id}`,
        async delete() { records.delete(`${name}/${id}`); },
      }; } };
    },
    runTransaction(callback) {
      const task = queue.then(() => callback({
        async get(ref) { return { data: () => records.get(ref.key) }; },
        set(ref, value) { records.set(ref.key, value); },
      }));
      queue = task.catch(() => undefined);
      return task;
    },
  };
}

const quietLogger = { logError() {}, logInfo() {}, logWarning() {}, requestIdFrom: () => 'test-request' };
const request = (url, body) => new NextRequest(`http://localhost${url}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', host: 'localhost' }, body: JSON.stringify(body),
});

test('actual persistent limiter accepts exactly the limit under simultaneous requests and stores no raw subject', async () => {
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = 'true';
  const db = fakeDatabase();
  const limiter = load('src/lib/security/rate-limit.ts', { '@/lib/firebase/admin': { adminDb: db } });
  const results = await Promise.allSettled(Array.from({ length: 12 }, () =>
    limiter.consumeRateLimit('test-login', 'private@example.invalid', { limit: 3, windowMs: 60000, blockMs: 60000 })));
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 3);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 9);
  assert.equal(db.records.size, 1);
  assert.doesNotMatch(JSON.stringify([...db.records]), /private@example/);
  const restartedLimiter = load('src/lib/security/rate-limit.ts', { '@/lib/firebase/admin': { adminDb: db } });
  await assert.rejects(() => restartedLimiter.consumeRateLimit('test-login', 'private@example.invalid', { limit: 3, windowMs: 60000, blockMs: 60000 }), { status: 429 });
});

test('actual RH and ADMIN guards reject missing session, wrong role and mandatory password change', async () => {
  const users = { u1: { active: true, role: 'RH', name: 'Test', email: 'test@example.invalid' } };
  let cookie = null;
  const mocks = {
    '@/lib/firebase/admin': {
      adminAuth: { verifySessionCookie: async () => ({ uid: 'u1' }) },
      adminDb: { collection: () => ({ doc: (id) => ({ get: async () => ({ exists: Boolean(users[id]), id, data: () => users[id] }) }) }) },
    },
    'next/headers': { cookies: async () => ({ get: () => cookie ? { value: cookie } : undefined }) },
    '@/lib/services/audit.service': {},
    '@/lib/utils': { toDate: () => null },
  };
  const auth = load('src/lib/services/auth.service.ts', mocks);
  await assert.rejects(auth.requireRH, /Não autenticado/);
  cookie = 'session';
  assert.equal((await auth.requireRH()).role, 'RH');
  await assert.rejects(auth.requireAdmin, /Acesso negado/);
  users.u1.mustChangePassword = true;
  await assert.rejects(auth.requireRH, /Troca de senha obrigatória/);
  users.u1.mustChangePassword = false;
  users.u1.active = false;
  await assert.rejects(auth.requireRH, /Não autenticado/);
});

test('public identification handler rejects invalid payload and returns 429 before reading participant data', async () => {
  const db = fakeDatabase();
  let calls = 0;
  const route = load('src/app/api/avaliacoes/acesso/route.ts', {
    '@/lib/firebase/admin': { adminDb: db },
    '@/lib/leadership/service': { getLeadershipAccessContext: async () => { calls++; return { available: [] }; } },
    '@/lib/observability/logger': quietLogger,
  });
  const invalid = await route.POST(request('/api/avaliacoes/acesso', { registration: '' }));
  assert.equal(invalid.status, 400);
  for (let index = 0; index < 10; index++) assert.equal((await route.POST(request('/api/avaliacoes/acesso', { registration: '001' }))).status, 200);
  const limited = await route.POST(request('/api/avaliacoes/acesso', { registration: '001' }));
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('Retry-After')) > 0);
  assert.equal(calls, 10);
});

test('actual administrative handlers return 401/403 without invoking protected services', async () => {
  const specs = [
    ['src/app/api/admin/colegas/participacao/route.ts', '@/lib/peer/service', 'getPeerParticipation'],
    ['src/app/api/admin/colegas/relatorio/route.ts', '@/lib/peer/service', 'getPeerReport'],
    ['src/app/api/admin/usuarios/route.ts', '@/lib/services/auth.service', 'getAdminUsers'],
    ['src/app/api/admin/relatorios/export/route.ts', '@/lib/services/reports.service', 'getAllManagerResults'],
  ];
  for (const [file, service, functionName] of specs) {
    for (const [message, status] of [['Não autenticado', 401], ['Acesso negado: requer papel ADMIN', 403], ['Acesso negado: Troca de senha obrigatória', 403]]) {
      let called = false;
      const denial = async () => { throw new Error(message); };
      const mocks = {
        '@/lib/firebase/admin': { adminDb: fakeDatabase() },
        '@/lib/services/auth.service': { requireRH: denial, requireAdmin: denial },
        '@/lib/observability/logger': quietLogger,
        '@/lib/services/periods.service': {},
        '@/lib/services/audit.service': {},
        [service]: { [functionName]: async () => { called = true; throw new Error('service called'); } },
      };
      if (service === '@/lib/services/auth.service') Object.assign(mocks[service], { requireRH: denial, requireAdmin: denial });
      const route = load(file, mocks);
      const response = await route.GET(new NextRequest('http://localhost/api/test?periodId=cycle'));
      assert.equal(response.status, status, file);
      assert.equal(called, false, file);
    }
  }
});

test('password update authenticates current password server-side and rejects a different UID', async () => {
  let updated = false;
  const route = load('src/app/api/admin/conta/senha/route.ts', {
    '@/lib/firebase/admin': { adminDb: fakeDatabase(), adminAuth: { verifyIdToken: async () => ({ uid: 'other' }), updateUser: async () => { updated = true; } } },
    '@/lib/services/auth.service': { getCurrentUser: async () => ({ id: 'user', email: 'test@example.invalid' }) },
    '@/lib/security/password-auth': { authenticateWithFirebase: async () => 'token', InvalidCredentialsError: class extends Error {} },
    '@/lib/services/audit.service': {},
    '@/lib/observability/logger': quietLogger,
  });
  const result = await route.POST(request('/api/admin/conta/senha', { currentPassword: 'current', newPassword: 'NewPass1!' }));
  assert.equal(result.status, 403);
  assert.equal(updated, false);
});

test('login handler creates a protected cookie only for an active provisioned account', async () => {
  let account = { active: true, role: 'ADMIN', mustChangePassword: true };
  let updated = false;
  const route = load('src/app/api/admin/login/route.ts', {
    '@/lib/firebase/admin': {
      adminAuth: { verifyIdToken: async () => ({ uid: 'admin' }) },
      adminDb: { collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => account }), update: async () => { updated = true; } }) }) },
    },
    '@/lib/security/rate-limit': { enforceRequestRateLimit: async () => {}, loginRateLimitPolicy: () => ({}), clearRateLimit: async () => {}, RateLimitExceededError: class extends Error {}, rateLimitHeaders: () => ({}) },
    '@/lib/security/password-auth': { authenticateWithFirebase: async () => 'verified-token', InvalidCredentialsError: class extends Error {} },
    '@/lib/services/auth.service': { createSessionCookie: async () => 'protected-session', SESSION_COOKIE_NAME: 'session' },
    '@/lib/observability/logger': quietLogger,
  });
  const good = await route.POST(request('/api/admin/login', { email: 'admin@example.invalid', password: 'Password1!' }));
  assert.equal(good.status, 200);
  assert.equal((await good.json()).mustChangePassword, true);
  assert.match(good.headers.get('set-cookie'), /HttpOnly/);
  assert.match(good.headers.get('set-cookie'), /SameSite=lax/i);
  assert.equal(updated, true);
  for (const change of [{ active: false }, { deleting: true }, { role: 'UNKNOWN' }]) {
    account = { active: true, role: 'ADMIN', ...change };
    updated = false;
    const denied = await route.POST(request('/api/admin/login', { email: 'admin@example.invalid', password: 'Password1!' }));
    assert.equal(denied.status, 403);
    assert.equal(updated, false);
    assert.equal(denied.headers.get('set-cookie'), null);
  }
});

test('middleware accepts spreadsheet multipart upload but refuses other non-JSON mutations', () => {
  const { middleware } = load('src/middleware.ts');
  const upload = new NextRequest('http://localhost/api/admin/colegas/importar', { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=test', host: 'localhost' } });
  assert.equal(middleware(upload).status, 200);
  const bad = new NextRequest('http://localhost/api/admin/usuarios', { method: 'POST', headers: { 'content-type': 'text/plain', host: 'localhost' } });
  assert.equal(middleware(bad).status, 415);
});

test('public submission rejects tampered participation tokens before creating rate counters or responses', async () => {
  let touched = false;
  const mocks = {
    '@/lib/services/evaluations.service': { submitTeamEvaluation: async () => { touched = true; } },
    '@/lib/peer/service': { submitOpenPeerEvaluation: async () => { touched = true; } },
    '@/lib/security/rate-limit': { consumeRateLimit: async () => { touched = true; }, sensitiveActionRateLimitPolicy: () => ({}), RateLimitExceededError: class extends Error {}, rateLimitHeaders: () => ({}) },
    '@/lib/observability/logger': quietLogger,
  };
  const badToken = 'invalid-participation-token-with-more-than-forty-characters';
  const leadership = load('src/app/api/avaliacoes/route.ts', mocks);
  const peer = load('src/app/api/avaliacoes-colegas/route.ts', mocks);
  const leaderResult = await leadership.POST(request('/api/avaliacoes', { managerId: 'leader', periodId: 'cycle', evaluationType: 'TEAM', answers: [{ criterionId: 'criterion', score: 3 }], participationToken: badToken }));
  assert.equal(leaderResult.status, 401);
  const peerResult = await peer.POST(request('/api/avaliacoes-colegas', { coworkerId: 'peer', periodId: 'cycle', participationToken: badToken, scores: { criterion: 3 }, colleagueConfirmed: true }));
  assert.equal(peerResult.status, 401);
  assert.equal(touched, false);
});

test('readiness returns only a generic unavailable response when Firestore fails', async () => {
  const route = load('src/app/api/ready/route.ts', {
    '@/lib/firebase/admin': { adminDb: { collection: () => ({ doc: () => ({ get: async () => { throw new Error('private project credentials'); } }) }) } },
    '@/lib/security/config': { assertProductionSecurityConfiguration() {} },
    '@/lib/observability/logger': quietLogger,
  });
  const result = await route.GET(new NextRequest('http://localhost/api/ready'));
  assert.equal(result.status, 503);
  assert.deepEqual(await result.json(), { status: 'unavailable' });
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('participation secret rotation preserves old token signatures and deterministic participation candidates', () => {
  const security = load('src/lib/participation-security.ts');
  const savedPrimary = process.env.PARTICIPATION_SECRET;
  const savedPrevious = process.env.PARTICIPATION_PREVIOUS_SECRETS;
  try {
    process.env.PARTICIPATION_SECRET = 'old-participation-secret-with-32-characters';
    process.env.PARTICIPATION_PREVIOUS_SECRETS = '';
    const oldHash = security.primaryParticipationHash('participant:leader:cycle');
    const token = security.signParticipationToken({ kind: 'LEADERSHIP', participantId: 'participant', departmentId: 'department', periodId: 'cycle' });
    process.env.PARTICIPATION_PREVIOUS_SECRETS = process.env.PARTICIPATION_SECRET;
    process.env.PARTICIPATION_SECRET = 'new-participation-secret-with-32-characters';
    assert.equal(security.verifyParticipationToken(token, 'LEADERSHIP').participantId, 'participant');
    assert.ok(security.participationHashCandidates('participant:leader:cycle').includes(oldHash));
    assert.notEqual(security.primaryParticipationHash('participant:leader:cycle'), oldHash);
  } finally {
    if (savedPrimary === undefined) delete process.env.PARTICIPATION_SECRET; else process.env.PARTICIPATION_SECRET = savedPrimary;
    if (savedPrevious === undefined) delete process.env.PARTICIPATION_PREVIOUS_SECRETS; else process.env.PARTICIPATION_PREVIOUS_SECRETS = savedPrevious;
  }
});

test('Firebase password adapter distinguishes wrong credentials from API configuration failure', async () => {
  const adapter = load('src/lib/security/password-auth.ts');
  const originalFetch = global.fetch;
  const previousKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'demo-test-key';
  try {
    global.fetch = async () => new Response(JSON.stringify({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } }), { status: 400 });
    await assert.rejects(() => adapter.authenticateWithFirebase('fixture@example.invalid', 'Fixture1!'), adapter.InvalidCredentialsError);
    global.fetch = async () => new Response(JSON.stringify({ error: { message: 'API_KEY_HTTP_REFERRER_BLOCKED' } }), { status: 403 });
    await assert.rejects(() => adapter.authenticateWithFirebase('fixture@example.invalid', 'Fixture1!'), (error) => !(error instanceof adapter.InvalidCredentialsError) && error.message === 'Authentication service unavailable');
  } finally {
    global.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY; else process.env.NEXT_PUBLIC_FIREBASE_API_KEY = previousKey;
  }
});
