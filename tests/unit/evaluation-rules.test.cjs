const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = 'true';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'demo-avalia-gestao-tests';
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, file);
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveProjectAlias(request, parent, isMain, options) {
  if (request.startsWith('@/')) request = path.join(__dirname, '../../src', request.slice(2));
  return resolveFilename.call(this, request, parent, isMain, options);
};
const { validateAnswers, calculateAverage, hasEnoughDataForDisplay } = require('../../src/lib/calculations/index.ts');
const { parsePeriodDate, normalizeStoredPeriodDate, isPeriodAcceptingResponses } = require('../../src/lib/utils/periods.ts');
const { criterionMatchesModality } = require('../../src/lib/criteria-modality.ts');
const { coworkerSchema, openPeerSubmissionSchema } = require('../../src/lib/peer/validation.ts');
const { parsePeerImport } = require('../../src/lib/peer/types.ts');
const { buildAnonymousPeerResponse, validatePeerRelationship } = require('../../src/lib/peer/participation.ts');
const { createPeriodSchema, developmentPlanSchema, submitEvaluationSchema } = require('../../src/lib/validators/index.ts');
const { buildAnonymousLeadershipResponse, leadershipPairKey, validateLeadershipRelationship, validUniqueEvaluationCount } = require('../../src/lib/leadership/participation.ts');
const { participationHashCandidates, primaryParticipationHash, signParticipationToken, verifyParticipationToken } = require('../../src/lib/participation-security.ts');

test('accepts one valid score for each configured criterion', () => {
  assert.equal(validateAnswers([{ criterionId: 'a', score: 1 }, { criterionId: 'b', score: 5 }], ['a', 'b']).valid, true);
});
test('rejects duplicate and unknown criteria that could manipulate the average', () => {
  assert.equal(validateAnswers([{ criterionId: 'a', score: 5 }, { criterionId: 'a', score: 5 }], ['a']).valid, false);
  assert.equal(validateAnswers([{ criterionId: 'a', score: 5 }, { criterionId: 'extra', score: 5 }], ['a']).valid, false);
});
test('rejects absent criteria, fractions, nonnumeric and out-of-scale scores', () => {
  assert.equal(validateAnswers([{ criterionId: 'a', score: 1 }], ['a', 'b']).valid, false);
  for (const score of [0, 6, 1.5, NaN, Infinity, '5', null]) assert.equal(validateAnswers([{ criterionId: 'a', score }], ['a']).valid, false);
  assert.equal(validateAnswers([{ criterionId: 'a', score: 1 }], []).valid, false);
});
test('empty results have no average; privacy threshold is inclusive', () => {
  assert.equal(calculateAverage([]), null);
  assert.equal(calculateAverage([1, 2, 5]), 2.67);
  assert.equal(hasEnoughDataForDisplay(4, 5), false);
  assert.equal(hasEnoughDataForDisplay(5, 5), true);
});
test('period includes entire final day in São Paulo and blocks expired/future/closed periods', () => {
  const period = { status: 'OPEN', startDate: parsePeriodDate('2026-09-01'), endDate: parsePeriodDate('2026-09-30', true) };
  assert.equal(period.startDate.toISOString(), '2026-09-01T03:00:00.000Z');
  assert.equal(period.endDate.toISOString(), '2026-10-01T02:59:59.999Z');
  assert.equal(isPeriodAcceptingResponses(period, period.startDate.getTime() - 1), false);
  assert.equal(isPeriodAcceptingResponses(period, period.endDate.getTime()), true);
  assert.equal(isPeriodAcceptingResponses(period, period.endDate.getTime() + 1), false);
  assert.equal(isPeriodAcceptingResponses({ ...period, status: 'CLOSED' }, period.startDate.getTime()), false);
});
test('legacy midnight UTC dates retain the intended calendar date', () => {
  assert.equal(normalizeStoredPeriodDate(new Date('2026-09-30T00:00:00Z'), true).toISOString(), '2026-10-01T02:59:59.999Z');
  assert.equal(Number.isNaN(parsePeriodDate('2026-02-31').getTime()), true);
});
test('leadership submission ignores active peer-only criteria', () => {
  const criteria = [
    { id: 'leadership', modality: 'LEADERSHIP' },
    { id: 'shared', modality: 'BOTH' },
    { id: 'peer', modality: 'PEER' },
    { id: 'legacy' },
  ];
  const leadershipIds = criteria
    .filter((criterion) => criterionMatchesModality(criterion.modality, 'LEADERSHIP'))
    .map((criterion) => criterion.id);
  assert.deepEqual(leadershipIds, ['leadership', 'shared', 'legacy']);
  assert.equal(validateAnswers(leadershipIds.map((criterionId) => ({ criterionId, score: 5 })), leadershipIds).valid, true);
  assert.equal(criterionMatchesModality('PEER', 'LEADERSHIP'), false);
  assert.equal(criterionMatchesModality('BOTH', 'PEER'), true);
});
test('validates public coworker registration and evaluation payloads', () => {
  assert.deepEqual(coworkerSchema.parse({ name: '  Maria Silva  ', departmentId: 'setor-1' }), {
    name: 'Maria Silva', registration: '', position: '', departmentId: 'setor-1', active: true,
  });
  const valid = openPeerSubmissionSchema.safeParse({
    coworkerId: 'pessoa-1',
    periodId: 'periodo-1',
    participationToken: `${'a'.repeat(50)}.${'b'.repeat(50)}`,
    scores: { collaboration: 5, respect: 4 },
    comment: '',
    colleagueConfirmed: true,
  });
  assert.equal(valid.success, true);
  assert.equal(openPeerSubmissionSchema.safeParse({
    coworkerId: 'pessoa-1', periodId: 'periodo-1', participationToken: 'curto',
    scores: { collaboration: 5 }, colleagueConfirmed: false,
  }).success, false);
});

test('validates spreadsheet rows and rejects duplicate registration before import', () => {
  const departments = [{ id: 'producao', name: 'Produção', active: true }];
  const rows = parsePeerImport('Nome;Matrícula;Setor;Cargo/Função\nAna;001;Produção;Operadora\nBia;001;Produção;Auxiliar', departments, []);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].error, undefined);
  assert.match(rows[1].error, /Matrícula duplicada/);
  assert.match(parsePeerImport('Nome;Matrícula;Setor;Cargo/Função\nAna;;Produção;Operadora', departments, [])[0].error, /Matrícula obrigatória/);
  assert.match(parsePeerImport('Nome;Matrícula;Setor;Cargo/Função\nAna;002;Inexistente;Operadora', departments, [])[0].error, /Setor ativo não encontrado/);
});

test('peer participation rules block self, cross-sector and duplicate-capable targets', () => {
  const evaluator = { id: 'a', departmentId: 'setor-1', active: true };
  assert.equal(validatePeerRelationship(evaluator, { id: 'b', departmentId: 'setor-1', active: true }), null);
  assert.match(validatePeerRelationship(evaluator, evaluator), /si próprio/);
  assert.match(validatePeerRelationship(evaluator, { id: 'b', departmentId: 'setor-2', active: true }), /seu setor/);
  assert.match(validatePeerRelationship(evaluator, { id: 'b', departmentId: 'setor-1', active: false }), /não está disponível/);
});

test('anonymous peer response contains target and scores but never evaluator identity', () => {
  const record = buildAnonymousPeerResponse({ targetId: 'target', targetName: 'Colega', departmentId: 'setor', departmentName: 'Produção', periodId: 'ciclo', scores: { respeito: 5 }, criteriaSnapshot: [], comment: 'Bom trabalho', createdAt: new Date(0) });
  assert.equal(record.coworkerId, 'target');
  assert.equal(record.scores.respeito, 5);
  assert.equal('evaluatorId' in record, false);
  assert.equal('registration' in record, false);
});

test('professional cycles require valid dates and at least one evaluation modality', () => {
  assert.equal(createPeriodSchema.safeParse({ name: 'Ciclo 2026', startDate: '2026-09-01', endDate: '2026-09-30', modalities: ['LEADERSHIP', 'PEER'] }).success, true);
  assert.equal(createPeriodSchema.safeParse({ name: 'Ciclo 2026', startDate: '2026-09-01', endDate: '2026-09-30', modalities: [] }).success, false);
  assert.equal(createPeriodSchema.safeParse({ name: 'Ciclo 2026', startDate: '2026-10-01', endDate: '2026-09-30', modalities: ['PEER'] }).success, false);
});

test('development plans accept the four workflow states and reject incomplete records', () => {
  const base = {
    title: 'Melhorar comunicação', scope: 'LEADERSHIP', subjectId: 'lideranca-1',
    area: 'Comunicação', action: 'Realizar treinamento e acompanhar os próximos feedbacks.',
    owner: 'RH/DP', dueDate: '2026-11-30',
  };
  for (const status of ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']) {
    assert.equal(developmentPlanSchema.safeParse({ ...base, status }).success, true);
  }
  assert.equal(developmentPlanSchema.safeParse({ ...base, status: 'UNKNOWN' }).success, false);
  assert.equal(developmentPlanSchema.safeParse({ ...base, title: '', status: 'PLANNED' }).success, false);
});

test('leadership access token is signed server-side and rejects tampering or the wrong modality', () => {
  const token = signParticipationToken({ kind: 'LEADERSHIP', participantId: 'pessoa-a', departmentId: 'setor-1', periodId: 'ciclo-1' });
  const payload = verifyParticipationToken(token, 'LEADERSHIP');
  assert.equal(payload.participantId, 'pessoa-a');
  assert.equal(payload.periodId, 'ciclo-1');
  const [body, signature] = token.split('.');
  const tamperedSignature = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
  assert.throws(() => verifyParticipationToken(`${body}.${tamperedSignature}`, 'LEADERSHIP'));
  assert.throws(() => verifyParticipationToken(token, 'PEER'));
});

test('leadership API contract requires a server-signed participation token', () => {
  const payload = {
    managerId: 'lideranca-1', periodId: 'periodo-1', evaluationType: 'TEAM',
    answers: [{ criterionId: 'criterio-1', score: 5 }],
  };
  assert.equal(submitEvaluationSchema.safeParse(payload).success, false);
  assert.equal(submitEvaluationSchema.safeParse({ ...payload, submissionToken: 'token-do-navegador' }).success, false);
  assert.equal(submitEvaluationSchema.safeParse({ ...payload, participationToken: `${'a'.repeat(50)}.${'b'.repeat(50)}` }).success, true);
});

test('one participant can evaluate different eligible leaders but never the same pair twice', async () => {
  const reservations = new Set();
  const atomicSubmit = async (participantId, managerId) => {
    const relationship = validateLeadershipRelationship(
      { id: participantId, departmentId: 'setor-1', active: true },
      { id: managerId, departmentId: 'setor-1', active: true },
    );
    if (relationship) throw new Error(relationship);
    const id = primaryParticipationHash(leadershipPairKey('ciclo-1', participantId, managerId));
    await Promise.resolve();
    if (reservations.has(id)) throw new Error('Você já avaliou esta liderança neste ciclo.');
    reservations.add(id);
    return id;
  };
  await atomicSubmit('pessoa-a', 'lider-x');
  await assert.rejects(() => atomicSubmit('pessoa-a', 'lider-x'), /já avaliou/);
  await atomicSubmit('pessoa-a', 'lider-y');
  await atomicSubmit('pessoa-b', 'lider-x');
  assert.equal(reservations.size, 3);
});

test('simultaneous submissions resolve to one deterministic participation document', async () => {
  const committed = new Set();
  const pairId = primaryParticipationHash(leadershipPairKey('ciclo', 'participante', 'lideranca'));
  const transaction = async () => {
    await Promise.resolve();
    if (committed.has(pairId)) throw new Error('duplicate');
    committed.add(pairId);
    return 'accepted';
  };
  const results = await Promise.allSettled([transaction(), transaction()]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.equal(committed.size, 1);
});

test('leadership eligibility blocks inactive participants, inactive leaders and cross-sector IDs', () => {
  const active = { id: 'a', departmentId: 'setor-1', active: true };
  assert.equal(validateLeadershipRelationship(active, { id: 'x', departmentId: 'setor-1', active: true }), null);
  assert.match(validateLeadershipRelationship({ ...active, active: false }, { id: 'x', departmentId: 'setor-1', active: true }), /não está ativo/);
  assert.match(validateLeadershipRelationship(active, { id: 'x', departmentId: 'setor-1', active: false }), /não está disponível/);
  assert.match(validateLeadershipRelationship(active, { id: 'id-alterado', departmentId: 'outro-setor', active: true }), /seu setor/);
});

test('leadership response and comment contain no participant identity or participation link', () => {
  const record = buildAnonymousLeadershipResponse({ managerId: 'lider', periodId: 'ciclo', answers: [{ criterionId: 'respeito', criterionName: 'Respeito', score: 5 }], overallScore: 5, comment: 'Bom trabalho', createdAt: new Date(0) });
  assert.equal(record.participationVerified, true);
  for (const forbidden of ['participantId', 'participantHash', 'registration', 'matricula', 'participationId', 'participationToken', 'email', 'ip']) assert.equal(forbidden in record, false);
  assert.equal(record.comment, 'Bom trabalho');
});

test('anonymity threshold counts verified submissions in protected cycles and preserves legacy history', () => {
  const stored = [{ participationVerified: true }, { participationVerified: true }, { participationVerified: true }, { participationVerified: true }, {}];
  assert.equal(validUniqueEvaluationCount(stored, true), 4);
  assert.equal(hasEnoughDataForDisplay(validUniqueEvaluationCount(stored, true), 5), false);
  assert.equal(validUniqueEvaluationCount(stored, false), 5);
  assert.equal(hasEnoughDataForDisplay(validUniqueEvaluationCount(stored, false), 5), true);
});

test('production leadership backend reserves the deterministic pair inside one Firestore transaction', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../src/lib/services/evaluations.service.ts'), 'utf8');
  assert.match(source, /runTransaction/);
  assert.match(source, /leadershipPairKey\(dto\.periodId, identity\.participantId, dto\.managerId\)/);
  assert.match(source, /transaction\.create\(participationRef/);
  assert.match(source, /transaction\.create\(evaluationRef, buildAnonymousLeadershipResponse/);
  assert.match(source, /endDate: normalizeStoredPeriodDate\([^\n]+, true\)/);
  assert.equal(participationHashCandidates(leadershipPairKey('c', 'p', 'm'))[0], primaryParticipationHash(leadershipPairKey('c', 'p', 'm')));
});

test('administrative participation never exposes who evaluated whom', () => {
  const peerService = fs.readFileSync(path.join(__dirname, '../../src/lib/peer/service.ts'), 'utf8');
  const participationPanel = fs.readFileSync(path.join(__dirname, '../../src/components/peer/participation-panel.tsx'), 'utf8');
  const participationRead = peerService.slice(
    peerService.indexOf('export async function getPeerParticipation'),
    peerService.indexOf('export async function generatePeerLinks'),
  );
  assert.doesNotMatch(participationRead, /evaluatorName|targetName|targetHash|\brows\b/);
  assert.doesNotMatch(participationPanel, /evaluatorName|targetName|Colega avaliado/);
  assert.match(participationRead, /Somente totais agregados/);
});

test('new participation records keep only the hashes needed for aggregate counts', () => {
  const peerService = fs.readFileSync(path.join(__dirname, '../../src/lib/peer/service.ts'), 'utf8');
  const leadershipService = fs.readFileSync(path.join(__dirname, '../../src/lib/services/evaluations.service.ts'), 'utf8');
  const peerWrite = peerService.slice(peerService.indexOf('transaction.create(participationRef'), peerService.indexOf('return { submitted: true }'));
  const leadershipWrite = leadershipService.slice(leadershipService.indexOf('transaction.create(participationRef'), leadershipService.indexOf('transaction.set(rateLimitRef'));
  assert.match(peerWrite, /evaluatorHash/);
  assert.doesNotMatch(peerWrite, /targetHash/);
  assert.match(leadershipWrite, /participantHash/);
  assert.doesNotMatch(leadershipWrite, /leadershipHash/);
});
