const { test } = require('node:test');
const assert = require('node:assert/strict');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const ExcelJS = require('exceljs');
const { randomUUID } = require('node:crypto');

const base = process.env.TEST_APP_URL || 'http://127.0.0.1:3006';
const local = (value) => /^127\.0\.0\.1:\d+$/.test(value || '');
if (!local(process.env.FIRESTORE_EMULATOR_HOST) || !local(process.env.FIREBASE_AUTH_EMULATOR_HOST) ||
    !['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) {
  throw new Error('Integração permitida somente com aplicação e emuladores locais explícitos.');
}
const app = initializeApp({ projectId: 'demo-avalia-gestao' }, 'integration-test');
const db = getFirestore(app);
const auth = getAuth(app);
const password = 'FixtureOnly1!';

async function call(route, body, cookie, extraHeaders = {}) {
  return fetch(`${base}${route}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...extraHeaders },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(120000),
  });
}
async function identify(registration, peer = false) {
  const response = await call(peer ? '/api/avaliacoes-colegas/acesso' : '/api/avaliacoes/acesso', { registration });
  assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
  return (await response.json()).data;
}
async function login(email, suppliedPassword = password) {
  const response = await call('/api/admin/login', { email, password: suppliedPassword });
  assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
  return response.headers.get('set-cookie').split(';')[0];
}

test('real HTTP APIs and Firebase emulators preserve authorization, uniqueness and anonymous results', { timeout: 600000 }, async (t) => {
  t.after(async () => deleteApp(app));
  assert.equal((await db.collection('evaluationPeriods').doc('it-cycle').get()).exists, false, 'Use emuladores novos, sem importar dados anteriores de integração.');
  const now = new Date();
  const batch = db.batch();
  const set = (collection, id, data) => batch.set(db.collection(collection).doc(id), { createdAt: now, updatedAt: now, ...data });
  for (const id of ['it-sector', 'it-other']) set('departments', id, { name: id, active: true });
  for (const [id, sector, status] of [['it-leader', 'it-sector', 'ACTIVE'], ['it-second', 'it-sector', 'ACTIVE'], ['it-outsider', 'it-other', 'ACTIVE'], ['it-inactive', 'it-sector', 'INACTIVE']]) {
    set('managers', id, { name: id, position: 'Liderança fictícia', departmentId: sector, departmentName: sector, status });
  }
  for (let index = 1; index <= 6; index++) set('coworkers', `it-person-${index}`, {
    name: `Pessoa fictícia ${index}`, registration: `IT00${index}`, registrationNormalized: `IT00${index}`,
    departmentId: 'it-sector', departmentName: 'it-sector', position: 'Operador', active: true,
  });
  set('coworkers', 'it-outside-person', { name: 'Outro setor', registration: 'ITOUT', registrationNormalized: 'ITOUT', departmentId: 'it-other', active: true });
  set('coworkers', 'it-disabled-person', { name: 'Inativo', registration: 'ITOFF', registrationNormalized: 'ITOFF', departmentId: 'it-sector', active: false });
  set('evaluationPeriods', 'it-cycle', { name: 'Integração fictícia', status: 'OPEN', startDate: new Date(now.getTime() - 86400000), endDate: new Date(now.getTime() + 86400000), modalities: ['LEADERSHIP', 'PEER'], leadershipParticipationRequired: true });
  set('evaluationPeriods', 'it-history', { name: 'Histórico fictício', status: 'CLOSED', startDate: new Date(now.getTime() - 20 * 86400000), endDate: new Date(now.getTime() - 10 * 86400000) });
  set('evaluations', 'it-historical-answer', { managerId: 'it-leader', periodId: 'it-history', evaluationType: 'TEAM', answers: [], overallScore: 2 });
  set('criteria', 'it-criterion', { name: 'Colaboração', description: 'Critério fictício', active: true, order: 1, modality: 'BOTH' });
  set('settings', 'app', { companyName: 'Empresa de teste', appName: 'Avalia Gestão', minEvaluationsForDisplay: 5, commentsEnabled: true });
  const accounts = [];
  for (const [uid, role, forced] of [['it-admin', 'ADMIN', false], ['it-rh', 'RH', false], ['it-forced', 'ADMIN', true]]) {
    const email = `${uid}-${randomUUID()}@example.invalid`;
    try { await auth.deleteUser(uid); } catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
    await auth.createUser({ uid, email, password });
    accounts.push(email);
    set('users', uid, { email, name: 'Conta fictícia', role, active: true, mustChangePassword: forced });
  }
  await batch.commit();
  // Abort the entire suite if the HTTP app cannot authenticate the users just
  // created in the local emulator. Do not continue against a mismatched server.
  const adminCookie = await login(accounts[0]);
  const rhCookie = await login(accounts[1]);
  const leaderBody = (context, managerId = 'it-leader') => ({ managerId, periodId: context.period.id, evaluationType: 'TEAM', participationToken: context.participationToken, answers: context.criteria.map((criterion) => ({ criterionId: criterion.id, score: 3 })), comment: 'Comentário fictício anônimo' });
  const peerBody = (context, coworkerId = 'it-person-6') => ({ coworkerId, periodId: context.period.id, participationToken: context.participationToken, scores: Object.fromEntries(context.criteria.map((criterion) => [criterion.id, 4])), comment: 'Comentário fictício', colleagueConfirmed: true });

  await t.test('health and readiness succeed with Firestore reachable', async () => {
    assert.equal((await call('/api/health')).status, 200);
    assert.equal((await call('/api/ready')).status, 200);
  });
  await t.test('real credentials create sessions and server RBAC denies absent/wrong-role access', async () => {
    assert.equal((await call('/api/admin/usuarios')).status, 401);
    assert.equal((await call('/api/admin/usuarios', undefined, rhCookie)).status, 403);
    assert.equal((await call('/api/admin/usuarios', undefined, adminCookie)).status, 200);
    assert.equal((await call('/api/configuracoes', undefined, rhCookie)).status, 403);
  });
  await t.test('invalid payload and cross-site request are rejected before mutation', async () => {
    assert.equal((await call('/api/avaliacoes/acesso', { registration: '' })).status, 400);
    assert.equal((await call('/api/avaliacoes/acesso', { registration: 'IT001' }, undefined, { Origin: 'https://other.invalid' })).status, 403);
  });
  await t.test('one participant may evaluate two eligible leaders and concurrent replay accepts exactly one', async () => {
    const context = await identify('IT001');
    assert.deepEqual(context.leaders.map((leader) => leader.id).sort(), ['it-leader', 'it-second']);
    assert.equal((await call('/api/avaliacoes', leaderBody(context))).status, 201);
    assert.equal((await call('/api/avaliacoes', leaderBody(context))).status, 409);
    const results = await Promise.all(Array.from({ length: 6 }, () => call('/api/avaliacoes', leaderBody(context, 'it-second'))));
    assert.equal(results.filter((result) => result.status === 201).length, 1);
    assert.equal(results.filter((result) => result.status === 409).length, 5);
    assert.equal((await db.collection('evaluations').where('periodId', '==', 'it-cycle').get()).size, 2);
  });
  await t.test('manual target changes, inactive person and inactive leadership are blocked by backend', async () => {
    const context = await identify('IT002');
    assert.equal((await call('/api/avaliacoes', leaderBody(context, 'it-outsider'))).status, 400);
    assert.equal((await call('/api/avaliacoes', leaderBody(context, 'it-inactive'))).status, 400);
    assert.equal((await call('/api/avaliacoes/acesso', { registration: 'ITOFF' })).status, 403);
    const outside = await identify('ITOUT');
    assert.equal((await call('/api/avaliacoes', leaderBody(outside))).status, 400);
  });
  await t.test('five distinct participants produce five verified responses without identifying authors', async () => {
    for (let index = 2; index <= 5; index++) assert.equal((await call('/api/avaliacoes', leaderBody(await identify(`IT00${index}`)))).status, 201);
    const responses = await db.collection('evaluations').where('periodId', '==', 'it-cycle').where('managerId', '==', 'it-leader').get();
    assert.equal(responses.size, 5);
    for (const document of responses.docs) {
      const data = document.data();
      assert.equal(data.participationVerified, true);
      for (const field of ['participantId', 'participantHash', 'registration', 'email', 'participationToken', 'participationId']) assert.equal(Object.hasOwn(data, field), false);
    }
    assert.equal((await db.collection('evaluations').doc('it-historical-answer').get()).exists, true);
    const completed = await identify('IT001');
    assert.equal(completed.leaders.every((leader) => leader.completed), true);
  });
  await t.test('peer evaluation preserves single participation, concurrent replay and sector restrictions', async () => {
    const context = await identify('IT001', true);
    assert.equal((await call('/api/avaliacoes-colegas', peerBody(context))).status, 201);
    assert.equal((await call('/api/avaliacoes-colegas', peerBody(context))).status, 409);
    assert.equal((await call('/api/avaliacoes-colegas', peerBody(context, 'it-outside-person'))).status, 403);
    assert.equal((await call('/api/avaliacoes-colegas', peerBody(context, 'it-person-1'))).status, 403);
    const second = await identify('IT002', true);
    const results = await Promise.all(Array.from({ length: 4 }, () => call('/api/avaliacoes-colegas', peerBody(second))));
    assert.equal(results.filter((response) => response.status === 201).length, 1);
    assert.equal(results.filter((response) => response.status === 409).length, 3);
  });
  await t.test('peer reports protect results below five unique participants then release only aggregates', async () => {
    const report = async () => (await (await call('/api/admin/colegas/relatorio?periodId=it-cycle', undefined, rhCookie)).json()).data;
    const protectedRow = (await report()).rows.find((row) => row.coworkerId === 'it-person-6');
    assert.equal((await db.collection('peerEvaluations').where('coworkerId', '==', 'it-person-6').get()).size, 2);
    assert.equal(protectedRow.count, 0); assert.equal(protectedRow.average, null); assert.deepEqual(protectedRow.comments, []);
    for (let index = 3; index <= 5; index++) assert.equal((await call('/api/avaliacoes-colegas', peerBody(await identify(`IT00${index}`, true)))).status, 201);
    const visible = (await report()).rows.find((row) => row.coworkerId === 'it-person-6');
    assert.equal(visible.count, 5); assert.equal(visible.average, 4);
    const participation = await (await call('/api/admin/colegas/participacao?periodId=it-cycle', undefined, rhCookie)).json();
    assert.equal(participation.data.participants, 5);
    assert.doesNotMatch(JSON.stringify(participation), /IT00|Pessoa fictícia|evaluatorHash|participationToken/);
    const responses = await db.collection('peerEvaluations').get();
    for (const document of responses.docs) for (const field of ['evaluatorId', 'evaluatorHash', 'registration', 'token', 'participationToken', 'participationId']) assert.equal(Object.hasOwn(document.data(), field), false);
  });
  await t.test('Excel export is authorized and does not contain participant registrations', async () => {
    const response = await call('/api/admin/relatorios/export?periodo=it-cycle', undefined, rhCookie);
    assert.equal(response.status, 200);
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));
    assert.ok(workbook.worksheets.length > 0);
    assert.doesNotMatch(JSON.stringify(workbook.model), /IT00|participationToken|participantHash/);
  });
  await t.test('closed period rejects new leadership and peer submissions', async () => {
    const leader = await identify('IT006'); const peer = await identify('IT006', true);
    await db.collection('evaluationPeriods').doc('it-cycle').update({ status: 'CLOSED' });
    assert.equal((await call('/api/avaliacoes', leaderBody(leader))).status, 400);
    assert.equal((await call('/api/avaliacoes-colegas', peerBody(peer, 'it-person-5'))).status, 409);
    await db.collection('evaluationPeriods').doc('it-cycle').update({ status: 'OPEN' });
  });
  await t.test('forced password change succeeds with real Firebase reauthentication and allows new login', async () => {
    const cookie = await login(accounts[2]);
    assert.equal((await call('/api/admin/usuarios', undefined, cookie)).status, 403);
    assert.equal((await call('/api/admin/conta/senha', { currentPassword: 'WrongFixture1!', newPassword: 'ChangedFixture2!' }, cookie)).status, 401);
    const changed = await call('/api/admin/conta/senha', { currentPassword: password, newPassword: 'ChangedFixture2!' }, cookie);
    assert.equal(changed.status, 200, JSON.stringify(await changed.clone().json()));
    assert.match(changed.headers.get('set-cookie'), /Max-Age=0/i);
    const freshCookie = await login(accounts[2], 'ChangedFixture2!');
    assert.equal((await call('/api/admin/usuarios', undefined, freshCookie)).status, 200);
    assert.equal((await call('/api/admin/login', { email: accounts[2], password })).status, 401);
  });
  await t.test('persistent login limit survives multiple real concurrent HTTP requests', async () => {
    const responses = await Promise.all(Array.from({ length: 12 }, () => call('/api/admin/login', { email: 'rate-fixture@example.invalid', password: 'WrongFixture1!' })));
    assert.equal(responses.filter((response) => response.status === 401).length, 8);
    assert.equal(responses.filter((response) => response.status === 429).length, 4);
    assert.ok(responses.filter((response) => response.status === 429).every((response) => Number(response.headers.get('retry-after')) > 0));
    const counters = await db.collection('securityRateLimits').get();
    assert.doesNotMatch(JSON.stringify(counters.docs.map((document) => document.data())), /rate-fixture@example|IT00/);
  });
});
