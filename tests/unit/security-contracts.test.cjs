const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(
  fs.readFileSync(file, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText, file);
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveProjectAlias(request, parent, isMain, options) {
  if (request.startsWith('@/')) request = path.join(__dirname, '../../src', request.slice(2));
  return resolveFilename.call(this, request, parent, isMain, options);
};

const { evaluateRateLimitAttempt } = require('../../src/lib/security/rate-limit-policy.ts');
const root = path.join(__dirname, '../..');
const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('rate limit allows the configured number of attempts and blocks the next one', () => {
  const policy = { limit: 3, windowMs: 60_000, blockMs: 120_000 };
  let state = null;
  for (let index = 0; index < 3; index++) {
    const decision = evaluateRateLimitAttempt(state, policy, 1_000 + index);
    assert.equal(decision.allowed, true);
    state = decision.nextState;
  }
  const denied = evaluateRateLimitAttempt(state, policy, 2_000);
  assert.equal(denied.allowed, false);
  assert.equal(denied.retryAfterSeconds, 120);
  assert.equal(denied.nextState.blockedUntil, 122_000);
});

test('rate limit stays blocked atomically and resets after the next window', () => {
  const policy = { limit: 1, windowMs: 1_000, blockMs: 2_000 };
  const first = evaluateRateLimitAttempt(null, policy, 10_000);
  const blocked = evaluateRateLimitAttempt(first.nextState, policy, 10_100);
  assert.equal(blocked.allowed, false);
  assert.equal(evaluateRateLimitAttempt(blocked.nextState, policy, 11_000).allowed, false);
  const reset = evaluateRateLimitAttempt(blocked.nextState, policy, 12_101);
  assert.equal(reset.allowed, true);
  assert.equal(reset.nextState.count, 1);
});

test('persistent limiter uses a Firestore transaction, HMAC document key and TTL field', () => {
  const limiter = source('src/lib/security/rate-limit.ts');
  assert.match(limiter, /adminDb\.runTransaction/);
  assert.match(limiter, /createHmac\('sha256'/);
  assert.match(limiter, /expiresAt:/);
  assert.doesNotMatch(limiter, /transaction\.set\([^]*\bkey,/);
});

test('login validates credentials on the server after persistent rate limiting', () => {
  const route = source('src/app/api/admin/login/route.ts');
  const page = source('src/app/admin/login/page.tsx');
  assert.match(route, /enforceRequestRateLimit\(req, 'admin-login'/);
  assert.match(source('src/lib/security/password-auth.ts'), /accounts:signInWithPassword/);
  assert.match(route, /createSessionCookie/);
  assert.doesNotMatch(page, /signInWithEmailAndPassword/);
  assert.match(page, /JSON\.stringify\(\{ email, password \}\)/);
});

test('both public identification endpoints enforce a normalized subject limit', () => {
  for (const routePath of [
    'src/app/api/avaliacoes/acesso/route.ts',
    'src/app/api/avaliacoes-colegas/acesso/route.ts',
  ]) {
    const route = source(routePath);
    assert.match(route, /normalizeRegistration\(input\.registration\)/);
    assert.match(route, /identificationRateLimitPolicy\(\)/);
    assert.match(route, /await enforceRequestRateLimit\([^]*return peerResponse\(await get(?:Leadership|Peer)AccessContext/);
  }
});

test('sensitive submissions and password operations have server-side limits', () => {
  const routes = [
    'src/app/api/avaliacoes/route.ts',
    'src/app/api/avaliacoes-colegas/route.ts',
    'src/app/api/admin/conta/senha/route.ts',
    'src/app/api/admin/usuarios/[id]/senha/route.ts',
    'src/app/api/admin/usuarios/route.ts',
    'src/app/api/admin/colegas/importar/route.ts',
  ];
  for (const routePath of routes) assert.match(source(routePath), /(?:consume|enforceRequest)RateLimit/);
});

test('administrative API routes require an authenticated RH or ADMIN account', () => {
  const adminRoot = path.join(root, 'src/app/api/admin');
  const routeFiles = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.name === 'route.ts') routeFiles.push(full);
    }
  };
  visit(adminRoot);
  const exceptions = new Set([
    path.join(adminRoot, 'login/route.ts'),
    path.join(adminRoot, 'logout/route.ts'),
    path.join(adminRoot, 'autoavaliacoes/route.ts'),
    path.join(adminRoot, 'autoavaliacoes/[id]/route.ts'),
  ]);
  for (const file of routeFiles.filter((item) => !exceptions.has(item))) {
    assert.match(fs.readFileSync(file, 'utf8'), /require(?:RH|Admin)|getCurrentUser/, path.relative(root, file));
  }
});

test('middleware rejects cross-site mutations and propagates a request correlation id', () => {
  const middleware = source('src/middleware.ts');
  assert.match(middleware, /site === 'cross-site'/);
  assert.match(middleware, /x-request-id/);
  assert.match(middleware, /X-Request-ID/);
  assert.match(middleware, /TRUST_PROXY/);
});

test('readiness checks Firestore and fails closed without exposing an error detail', () => {
  const readiness = source('src/app/api/ready/route.ts');
  assert.match(readiness, /SETTINGS_DOC_ID/);
  assert.match(readiness, /status: 'unavailable'/);
  assert.match(readiness, /status: 503/);
  assert.doesNotMatch(readiness, /error\.message/);
});
