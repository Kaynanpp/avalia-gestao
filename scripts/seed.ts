import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type UserRecord } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createHash, createHmac, randomBytes } from 'crypto';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd(), true);

if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR !== 'true') {
  throw new Error('Seed local bloqueado: NEXT_PUBLIC_USE_FIREBASE_EMULATOR precisa ser true.');
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-avalia-gestao';
const localEmulator = (value: string | undefined) => /^127\.0\.0\.1:\d+$/.test(value || '');
if (!projectId.startsWith('demo-') || !localEmulator(process.env.FIREBASE_AUTH_EMULATOR_HOST) || !localEmulator(process.env.FIRESTORE_EMULATOR_HOST)) {
  throw new Error('Seed exige projeto demo-* e hosts Auth/Firestore explícitos em 127.0.0.1.');
}
const email = (process.env.RH_SEED_EMAIL || 'rh@empresa.com').toLowerCase();
const password = process.env.RH_SEED_PASSWORD;

if (!password || password.length < 8) {
  throw new Error('Defina RH_SEED_PASSWORD com pelo menos 8 caracteres para criar a conta local de RH.');
}


if (!getApps().length) {
  initializeApp({ projectId });
}

const auth = getAuth();
const db = getFirestore();
const now = new Date();
const endDate = new Date(now);
endDate.setDate(endDate.getDate() + 30);
const previousStart = new Date(now); previousStart.setDate(previousStart.getDate() - 90);
const previousEnd = new Date(now); previousEnd.setDate(previousEnd.getDate() - 60);

const criteria = [
  ['lideranca', 'Liderança', 'Capacidade de guiar, motivar e inspirar a equipe rumo aos objetivos.'],
  ['comunicacao', 'Comunicação', 'Clareza, transparência e efetividade na transmissão de informações.'],
  ['organizacao', 'Organização', 'Planejamento, gestão do tempo e estruturação das atividades.'],
  ['respeito', 'Respeito e tratamento da equipe', 'Relacionamento respeitoso, empático e justo com todos os membros.'],
  ['suporte', 'Suporte à produção', 'Disponibilidade e efetividade em apoiar a equipe nas demandas diárias.'],
  ['decisao', 'Tomada de decisão', 'Agilidade e assertividade nas decisões, mesmo sob pressão.'],
  ['problemas', 'Capacidade de resolver problemas', 'Identificação e resolução eficaz de problemas operacionais e humanos.'],
  ['desenvolvimento', 'Desenvolvimento da equipe', 'Investimento no crescimento, capacitação e evolução dos membros da equipe.'],
] as const;

async function ensureRhUser() {
  let user: UserRecord;
  try {
    user = await auth.getUserByEmail(email);
    user = await auth.updateUser(user.uid, { password, displayName: 'Responsável de RH' });
  } catch (error) {
    if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
    user = await auth.createUser({ email, password, displayName: 'Responsável de RH' });
  }

  await auth.setCustomUserClaims(user.uid, { role: 'RH', name: 'Responsável de RH' });
  await db.collection('users').doc(user.uid).set({
    id: user.uid,
    email,
    name: 'Responsável de RH',
    role: 'RH',
    active: true,
    createdAt: new Date(user.metadata.creationTime),
    updatedAt: now,
  }, { merge: true });
  return user;
}

async function seedDemoData(userId: string) {
  const batch = db.batch();
  const departmentId = 'demo-setor-producao';
  const secondDepartmentId = 'demo-setor-expedicao';
  const periodId = 'demo-periodo-2026';
  const previousPeriodId = 'demo-periodo-anterior-2026';
  const managerIds = ['demo-gerente-ana', 'demo-gerente-rafael'];

  batch.set(db.collection('departments').doc(departmentId), {
    name: 'Produção', description: 'Setor de produção para demonstração.', active: true, createdAt: now, updatedAt: now,
  });
  batch.set(db.collection('departments').doc(secondDepartmentId), {
    name: 'Expedição', description: 'Setor de expedição para demonstração.', active: true, createdAt: now, updatedAt: now,
  });
  batch.set(db.collection('managers').doc(managerIds[0]), {
    name: 'Ana Martins', email: 'ana.martins@empresa.com', departmentId, departmentName: 'Produção',
    position: 'Gerente de Produção', status: 'ACTIVE', createdAt: now, updatedAt: now,
  });
  batch.set(db.collection('managers').doc(managerIds[1]), {
    name: 'Rafael Nunes', email: 'rafael.nunes@empresa.com', departmentId: secondDepartmentId, departmentName: 'Expedição',
    position: 'Gerente de Expedição', status: 'ACTIVE', createdAt: now, updatedAt: now,
  });
  batch.set(db.collection('evaluationPeriods').doc(periodId), {
    name: 'Ciclo de demonstração 2026', description: 'Dados fictícios para validação do AvaliaGestão.',
    startDate: now, endDate, status: 'OPEN', modalities: ['LEADERSHIP', 'PEER'], leadershipParticipationRequired: true,
    participationEnforcedAt: now, createdAt: now, updatedAt: now, openedAt: now, openedBy: userId,
  });
  batch.set(db.collection('evaluationPeriods').doc(previousPeriodId), {
    name: 'Ciclo anterior — demonstração', description: 'Período fictício para comparação histórica.',
    startDate: previousStart, endDate: previousEnd, status: 'CLOSED', modalities: ['LEADERSHIP', 'PEER'], createdAt: previousStart, updatedAt: previousEnd, closedAt: previousEnd, closedBy: userId,
  });
  batch.set(db.collection('settings').doc('app'), {
    companyName: 'Empresa de Demonstração', appName: 'AvaliaGestão', minEvaluationsForDisplay: 5,
    commentsEnabled: true, defaultPeriodId: periodId, updatedAt: now, updatedBy: userId,
  });

  criteria.forEach(([id, name, description], index) => {
    batch.set(db.collection('criteria').doc(`demo-criterio-${id}`), {
      name, description, order: index + 1, active: true, createdAt: now, updatedAt: now,
      modality: 'LEADERSHIP',
    });
  });

  const peerCriteria = [
    ['peer-colaboracao', 'Colaboração', 'Ajuda os colegas e contribui para o trabalho em equipe.'],
    ['peer-respeito', 'Respeito', 'Trata as pessoas com respeito e consideração.'],
    ['peer-comunicacao', 'Comunicação', 'Compartilha informações com clareza.'],
  ] as const;
  peerCriteria.forEach(([id, name, description], index) => batch.set(db.collection('criteria').doc(id), { name, description, order: index + 1, active: true, modality: 'PEER', createdAt: now, updatedAt: now }));

  const coworkers = [
    ['demo-colaborador-1', 'Mariana Costa', '1001', departmentId, 'Operadora de produção'],
    ['demo-colaborador-2', 'Carlos Souza', '1002', departmentId, 'Auxiliar de produção'],
    ['demo-colaborador-3', 'Fernanda Lima', '1003', departmentId, 'Analista de qualidade'],
    ['demo-colaborador-7', 'Beatriz Moraes', '1004', departmentId, 'Operadora de produção'],
    ['demo-colaborador-8', 'Diego Santos', '1005', departmentId, 'Auxiliar de produção'],
    ['demo-colaborador-4', 'João Ribeiro', '2001', secondDepartmentId, 'Conferente'],
    ['demo-colaborador-5', 'Paula Alves', '2002', secondDepartmentId, 'Auxiliar de expedição'],
    ['demo-colaborador-6', 'Renato Dias', '2003', secondDepartmentId, 'Operador logístico'],
  ] as const;
  coworkers.forEach(([id, name, registration, departmentIdValue, position]) => batch.set(db.collection('coworkers').doc(id), {
    name, normalizedName: name.toLocaleLowerCase('pt-BR'), registration, registrationNormalized: registration,
    position, departmentId: departmentIdValue, departmentName: departmentIdValue === departmentId ? 'Produção' : 'Expedição',
    active: true, revision: 1, createdAt: now, updatedAt: now,
  }));

  const scoreSets = [
    [4, 4, 5, 4, 4, 4, 4, 5],
    [4, 3, 4, 4, 4, 4, 3, 4],
    [5, 4, 4, 5, 4, 4, 4, 4],
    [4, 4, 4, 4, 5, 3, 4, 4],
    [5, 5, 4, 4, 4, 5, 4, 4],
    [3, 4, 3, 4, 3, 3, 4, 3],
    [4, 3, 4, 3, 4, 4, 3, 4],
  ];

  const demoSecret = createHash('sha256').update(process.env.PARTICIPATION_SECRET || `emulator:${projectId}`).digest();
  const participantHash = (value: string) => createHmac('sha256', demoSecret).update(value).digest('hex');

  scoreSets.forEach((scores, index) => {
    const managerId = index < 5 ? managerIds[0] : managerIds[1];
    const participant = coworkers[index];
    const evaluationId = `demo-avaliacao-equipe-${index + 1}`;
    batch.set(db.collection('evaluations').doc(evaluationId), {
      managerId,
      periodId,
      evaluationType: 'TEAM',
      answers: scores.map((score, criterionIndex) => ({
        criterionId: `demo-criterio-${criteria[criterionIndex][0]}`,
        score,
      })),
      overallScore: Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100,
      comment: null,
      createdAt: new Date(now.getTime() - index * 60_000),
      participationVerified: true,
    });
    batch.set(db.collection('leadershipParticipation').doc(participantHash(`leadership-pair:${periodId}:${participant[0]}:${managerId}`)), {
      periodId,
      departmentId: participant[3],
      participantHash: participantHash(`person:${participant[0]}`),
      leadershipHash: participantHash(`manager:${managerId}`),
      completedDate: now.toISOString().slice(0, 10),
    });
  });
  scoreSets.slice(0, 5).forEach((scores, index) => {
    batch.set(db.collection('evaluations').doc(`demo-avaliacao-anterior-${index + 1}`), {
      managerId: managerIds[0], periodId: previousPeriodId, evaluationType: 'TEAM',
      answers: scores.map((score, criterionIndex) => ({ criterionId: `demo-criterio-${criteria[criterionIndex][0]}`, criterionName: criteria[criterionIndex][1], score: Math.max(1, score - (criterionIndex % 2)) })),
      overallScore: 3.75, comment: null, createdAt: new Date(previousEnd.getTime() - index * 60_000),
    });
  });

  for (let index = 0; index < 5; index++) {
    const evaluator = coworkers[index];
    const candidates = coworkers.filter((entry) => entry[3] === evaluator[3] && entry[0] !== evaluator[0]);
    const target = candidates[0];
    if (!target) continue;
    batch.set(db.collection('peerEvaluations').doc(`demo-peer-${index + 1}`), {
      coworkerId: target[0], coworkerName: target[1], departmentId: target[3], departmentName: target[3] === departmentId ? 'Produção' : 'Expedição',
      periodId, scores: Object.fromEntries(peerCriteria.map(([id], criterionIndex) => [id, 3 + ((index + criterionIndex) % 3)])),
      criteriaSnapshot: peerCriteria.map(([id, name, description]) => ({ id, name, description })), comment: index === 0 ? 'Bom apoio no trabalho em equipe.' : null, createdAt: new Date(now.getTime() - index * 60_000), source: 'DEMO',
    });
    batch.set(db.collection('peerParticipation').doc(`demo-participacao-${index + 1}`), {
      periodId, departmentId: evaluator[3], evaluatorHash: participantHash(`person:${evaluator[0]}`), targetHash: participantHash(`person:${target[0]}`), completedDate: now.toISOString().slice(0, 10),
    });
  }

  batch.set(db.collection('developmentPlans').doc('demo-plano-comunicacao'), {
    title: 'Melhorar comunicação da liderança', scope: 'LEADERSHIP', subjectId: managerIds[0], subjectName: 'Ana Martins',
    area: 'Comunicação', action: 'Realizar treinamento de comunicação e feedback com acompanhamento do RH.', notes: 'Revisar evolução no próximo ciclo.',
    owner: 'RH/DP', dueDate: endDate, status: 'IN_PROGRESS', createdAt: now, updatedAt: now,
  });

  batch.set(db.collection('selfEvaluations').doc('demo-autoavaliacao-ana'), {
    managerId: managerIds[0], periodId, evaluationType: 'SELF', tokenId: 'demo-token-ana',
    answers: criteria.map(([id], index) => ({ criterionId: `demo-criterio-${id}`, score: [4, 4, 4, 5, 4, 4, 4, 4][index] })),
    overallScore: 4.13, comment: null, createdAt: now,
  });

  const selfTokenValue = randomBytes(36).toString('hex');
  batch.set(db.collection('selfEvaluationTokens').doc('demo-token-rafael'), {
    token: selfTokenValue, managerId: managerIds[1], periodId, status: 'PENDING', maxUses: 1, usedCount: 0,
    expiresAt: endDate, createdAt: now, updatedAt: now, createdBy: userId,
  });

  await batch.commit();
  return { periodId, selfTokenValue };
}

async function seed() {
  const user = await ensureRhUser();
  const demo = await seedDemoData(user.uid);
  console.log(`Conta local de RH pronta: ${email}`);
  console.log(`Período de demonstração: ${demo.periodId}`);
  console.log('Dados exclusivamente fictícios preparados nos emuladores locais.');
}

seed()
  .catch((error) => {
    console.error('Falha ao preparar o ambiente local:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all(getApps().map((app) => deleteApp(app)));
  });
