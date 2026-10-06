const { cert, deleteApp, getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const PEER_CRITERIA = [
  ['peer-collaboration', 'Colaboração', 'Ajuda os colegas e contribui para o trabalho em equipe.'],
  ['peer-respect', 'Respeito', 'Trata as pessoas com respeito, educação e consideração.'],
  ['peer-communication', 'Comunicação', 'Compartilha informações com clareza e escuta os colegas.'],
  ['peer-responsibility', 'Responsabilidade', 'Cumpre os combinados, os horários e os cuidados de segurança.'],
  ['peer-quality', 'Qualidade do trabalho', 'Executa suas atividades com atenção e cuidado.'],
];

function inferLeadershipLevel(position) {
  const normalized = String(position || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (normalized.includes('coorden')) return 'COORDINATOR';
  if (normalized.includes('supervis')) return 'SUPERVISOR';
  if (normalized.includes('lider')) return 'LEADER';
  if (normalized.includes('gerent')) return 'MANAGER';
  return 'OTHER';
}

async function initialize() {
  if (process.env.MIGRATION_ALLOW !== 'true') throw new Error('A migração exige MIGRATION_ALLOW=true.');
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) throw new Error('As credenciais do Firebase Admin não estão configuradas.');
  initializeApp({ projectId, credential: cert({ projectId, clientEmail, privateKey }) });
}

async function migrate() {
  await initialize();
  const db = getFirestore();
  const [criteria, managers, coworkers, periods, plans] = await Promise.all([
    db.collection('criteria').get(),
    db.collection('managers').get(),
    db.collection('coworkers').get(),
    db.collection('evaluationPeriods').get(),
    db.collection('developmentPlans').get(),
  ]);
  const batch = db.batch();
  const now = new Date();
  let leadershipCriteriaUpdated = 0;
  let leadershipsUpdated = 0;
  let peerCriteriaCreated = 0;
  let coworkersUpdated = 0;
  let periodsUpdated = 0;
  let plansUpdated = 0;

  for (const doc of criteria.docs) {
    if (!['LEADERSHIP', 'PEER', 'BOTH'].includes(doc.data().modality)) {
      batch.update(doc.ref, { modality: 'LEADERSHIP', updatedAt: now });
      leadershipCriteriaUpdated++;
    }
  }
  for (const doc of managers.docs) {
    if (!['MANAGER', 'COORDINATOR', 'SUPERVISOR', 'LEADER', 'OTHER'].includes(doc.data().leadershipLevel)) {
      batch.update(doc.ref, { leadershipLevel: inferLeadershipLevel(doc.data().position), updatedAt: now });
      leadershipsUpdated++;
    }
  }
  for (const doc of coworkers.docs) {
    const data = doc.data();
    const registration = String(data.registration || '').trim().normalize('NFKC').toUpperCase().replace(/[^A-Z0-9._-]/g, '');
    const update = {};
    if (data.registrationNormalized !== registration) update.registrationNormalized = registration;
    if (typeof data.position !== 'string') update.position = '';
    if (typeof data.normalizedName !== 'string') update.normalizedName = String(data.name || '').trim().normalize('NFKC').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
    if (Object.keys(update).length) { batch.update(doc.ref, { ...update, updatedAt: now }); coworkersUpdated++; }
  }
  for (const doc of periods.docs) {
    const data = doc.data();
    const update = {};
    if (!Array.isArray(data.modalities) || !data.modalities.length) update.modalities = ['LEADERSHIP', 'PEER'];
    // Closed cycles retain legacy counting because old anonymous answers cannot
    // be assigned safely to participants. Open/planned cycles use verified-only counting.
    if (data.status !== 'CLOSED' && data.leadershipParticipationRequired !== true) {
      update.leadershipParticipationRequired = true;
      update.participationEnforcedAt = now;
    }
    if (Object.keys(update).length) { batch.update(doc.ref, { ...update, updatedAt: now }); periodsUpdated++; }
  }
  for (const doc of plans.docs) {
    const data = doc.data();
    const update = {};
    if (!data.title) update.title = data.area || 'Plano de desenvolvimento';
    if (typeof data.notes !== 'string') update.notes = '';
    if (Object.keys(update).length) { batch.update(doc.ref, { ...update, updatedAt: now }); plansUpdated++; }
  }

  const hasPeerCriteria = criteria.docs.some((doc) => ['PEER', 'BOTH'].includes(doc.data().modality));
  if (!hasPeerCriteria) {
    PEER_CRITERIA.forEach(([id, name, description], index) => {
      batch.set(db.collection('criteria').doc(id), { name, description, order: index + 1, active: true, modality: 'PEER', createdAt: now, updatedAt: now }, { merge: false });
      peerCriteriaCreated++;
    });
  }

  if (leadershipCriteriaUpdated || leadershipsUpdated || peerCriteriaCreated || coworkersUpdated || periodsUpdated || plansUpdated) {
    batch.set(db.collection('auditLogs').doc(), {
      action: 'SYSTEM_MIGRATION', entityType: 'system',
      description: 'Estrutura atualizada para modalidades de liderança e colegas.',
      performedBy: 'system', performedByName: 'Migração da versão', createdAt: now,
      metadata: { leadershipCriteriaUpdated, leadershipsUpdated, peerCriteriaCreated, coworkersUpdated, periodsUpdated, plansUpdated },
    });
    await batch.commit();
  }
  console.log(JSON.stringify({ leadershipCriteriaUpdated, leadershipsUpdated, peerCriteriaCreated, coworkersUpdated, periodsUpdated, plansUpdated }));
}

migrate()
  .catch((error) => { console.error(`Migração não concluída: ${error.message}`); process.exitCode = 1; })
  .finally(async () => { await Promise.all(getApps().map((app) => deleteApp(app))); });
