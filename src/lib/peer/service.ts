import { createHash, randomBytes } from 'crypto';
import type { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { getDepartments } from '@/lib/services/departments.service';
import { getCriteria } from '@/lib/services/criteria.service';
import { getOpenPeriod, getPeriods } from '@/lib/services/periods.service';
import { getSettings } from '@/lib/services/settings.service';
import { toDate } from '@/lib/utils';
import { isPeriodAcceptingResponses, normalizeStoredPeriodDate } from '@/lib/utils/periods';
import { criterionMatchesModality } from '@/lib/criteria-modality';
import { PeerError } from './http';
import { coworkerSchema, openPeerSubmissionSchema, peerAccessSchema, peerLinkSchema, peerSubmissionSchema, peerTokenSchema } from './validation';
import { DEFAULT_PEER_CRITERIA, normalizePeerName, normalizeRegistration, parsePeerImport } from './types';
import type { Coworker, GeneratedPeerLink, PeerAccessContext, PeerCriterion, PeerDepartment, PeerLink, PeerReport, PeerReportRow, PeerScores, PublicPeerContext } from './types';
import { buildAnonymousPeerResponse, validatePeerRelationship } from './participation';
import { ParticipationTokenError, participationHashCandidates, primaryParticipationHash, signParticipationToken, verifyParticipationToken } from '@/lib/participation-security';

const COWORKERS = 'coworkers';
const TOKENS = 'peerEvaluationTokens';
const EVALUATIONS = 'peerEvaluations';
const PARTICIPATION = COLLECTIONS.PEER_PARTICIPATION;
const MAX_PEOPLE = 5000;
const unavailable = () => new PeerError('Este link está indisponível, expirou ou já foi utilizado. Solicite orientação ao RH.', 410);
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ');

function mapCoworker(doc: FirebaseFirestore.DocumentSnapshot): Coworker {
  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name,
    registration: data.registration || '',
    position: data.position || '',
    departmentId: data.departmentId,
    departmentName: data.departmentName,
    active: data.active === true,
  };
}

async function audit(action: string, actor: { id: string; name: string }, entityId: string | null, description: string) {
  // Audit entries contain administrative changes only, never response content or secret links.
  await adminDb.collection(COLLECTIONS.AUDIT_LOGS).add({ action, entityType: COWORKERS, entityId, description, performedBy: actor.id, performedByName: actor.name, createdAt: new Date() }).catch(() => undefined);
}

export async function getPeerManagementData() {
  const [people, departments, periods] = await Promise.all([
    adminDb.collection(COWORKERS).limit(MAX_PEOPLE + 1).get(), getDepartments(), getPeriods(),
  ]);
  if (people.size > MAX_PEOPLE) throw new PeerError('Limite de consulta atingido. Solicite suporte para ampliar o cadastro.');
  const departmentNames = new Map(departments.map((department) => [department.id, department.name]));
  return {
    coworkers: people.docs.map(mapCoworker).map((person) => ({ ...person, departmentName: departmentNames.get(person.departmentId) || person.departmentName })).sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    departments: departments.map(({ id, name, active }) => ({ id, name, active })),
    periods: periods.map((period) => ({ id: period.id, name: period.name, status: isPeriodAcceptingResponses(period) ? 'OPEN' : period.status === 'OPEN' ? 'OUTSIDE_DATES' : period.status, startDate: period.startDate.toISOString(), endDate: period.endDate.toISOString() })),
  };
}

export async function saveCoworker(id: string | null, input: z.infer<typeof coworkerSchema>, actor: { id: string; name: string }) {
  const ref = id ? adminDb.collection(COWORKERS).doc(id) : adminDb.collection(COWORKERS).doc();
  const departmentRef = adminDb.collection(COLLECTIONS.DEPARTMENTS).doc(input.departmentId);
  const existingPromise = id ? ref.get() : Promise.resolve(null);
  const totalPromise = id ? Promise.resolve(null) : adminDb.collection(COWORKERS).count().get();
  const registration = normalizeRegistration(input.registration);
  const registrationsPromise = registration
    ? adminDb.collection(COWORKERS).where('registrationNormalized', '==', registration).limit(2).get()
    : Promise.resolve(null);
  const [existing, department, peopleInDepartment, total, registrations] = await Promise.all([
    existingPromise,
    departmentRef.get(),
    adminDb.collection(COWORKERS).where('departmentId', '==', input.departmentId).get(),
    totalPromise,
    registrationsPromise,
  ]);
  if (id && !existing?.exists) throw new PeerError('Colega não encontrado.', 404);
  if (!department.exists) throw new PeerError('Setor não encontrado. Atualize a página e tente novamente.');
  if (input.active && department.data()?.active === false) throw new PeerError('Selecione um setor ativo.');
  if (!id && Number(total?.data().count || 0) >= MAX_PEOPLE) throw new PeerError('Limite de 5.000 pessoas atingido.');
  if (!id && !registration) throw new PeerError('Informe a matrícula para permitir o controle de participação.');
  if (registrations?.docs.some((person) => person.id !== ref.id)) throw new PeerError('Esta matrícula já está cadastrada.');
  const name = cleanName(input.name);
  if (peopleInDepartment.docs.some((person) => person.id !== ref.id && normalizePeerName(person.data().name) === normalizePeerName(name))) {
    throw new PeerError('Já existe uma pessoa com este nome neste setor. Use um complemento no nome em caso de homônimos.');
  }
  const old = existing?.data();
  const now = new Date();
  const data = {
    name,
    normalizedName: normalizePeerName(name),
    registration: registration || old?.registration || '',
    registrationNormalized: registration || old?.registrationNormalized || '',
    position: input.position.trim() || old?.position || '',
    departmentId: input.departmentId,
    departmentName: department.data()!.name,
    active: input.active,
    revision: (old?.revision || 0) + 1,
    updatedAt: now,
  };
  if (existing?.exists) await ref.update(data);
  else await ref.set({ ...data, createdAt: now });
  await audit(id ? 'COWORKER_UPDATED' : 'COWORKER_CREATED', actor, ref.id, `${id ? 'Atualizado' : 'Cadastrado'} colega ${name}.`);
  return { id: ref.id };
}

export async function deleteCoworker(id: string, actor: { id: string; name: string }) {
  const ref = adminDb.collection(COWORKERS).doc(id);
  await adminDb.runTransaction(async (transaction) => {
    const [person, history] = await Promise.all([transaction.get(ref), transaction.get(adminDb.collection(EVALUATIONS).where('coworkerId', '==', id).limit(1))]);
    if (!person.exists) throw new PeerError('Colega não encontrado.', 404);
    if (!history.empty) throw new PeerError('Esta pessoa possui avaliações. Desative o cadastro para preservar o histórico.');
    transaction.delete(ref);
  });
  await audit('COWORKER_DELETED', actor, id, 'Cadastro de colega sem avaliações excluído. Os links associados deixam de funcionar.');
}

export async function importCoworkers(text: string, preview: boolean, actor: { id: string; name: string }) {
  const result = await adminDb.runTransaction(async (transaction) => {
    const [departmentDocs, people] = await Promise.all([transaction.get(adminDb.collection(COLLECTIONS.DEPARTMENTS)), transaction.get(adminDb.collection(COWORKERS).limit(MAX_PEOPLE + 1))]);
    const departments: PeerDepartment[] = departmentDocs.docs.map((doc) => ({ id: doc.id, name: doc.data().name, active: doc.data().active !== false }));
    let rows;
    try { rows = parsePeerImport(text, departments, people.docs.map(mapCoworker)); }
    catch (error) { throw new PeerError(error instanceof Error ? error.message : 'Arquivo inválido.'); }
    if (preview) return { rows, imported: 0 };
    if (rows.some((row) => row.error)) throw new PeerError('Corrija os erros da prévia antes de importar. Nenhuma pessoa foi cadastrada.');
    if (people.size + rows.length > MAX_PEOPLE) throw new PeerError('A importação ultrapassa o limite de 5.000 pessoas.');
    const now = new Date();
    for (const row of rows) transaction.create(adminDb.collection(COWORKERS).doc(), {
      name: cleanName(row.name), normalizedName: normalizePeerName(row.name),
      registration: row.registration, registrationNormalized: normalizeRegistration(row.registration), position: row.position,
      departmentId: row.departmentId, departmentName: row.departmentName,
      active: true, revision: 1, createdAt: now, updatedAt: now,
    });
    return { rows, imported: rows.length };
  });
  if (!preview) await audit('COWORKERS_IMPORTED', actor, null, `${result.imported} colegas importados.`);
  return result;
}

function validPeriod(data: FirebaseFirestore.DocumentData | undefined) {
  if (!data) return false;
  const startDate = toDate(data.startDate), endDate = toDate(data.endDate);
  return Boolean(startDate && endDate && isPeriodAcceptingResponses({ status: data.status, startDate: startDate!, endDate: endDate! }));
}

function mapActivePeerCriteria(snapshot: FirebaseFirestore.QuerySnapshot): PeerCriterion[] {
  return snapshot.docs
    .filter((doc) => criterionMatchesModality(doc.data().modality, 'PEER'))
    .map((doc) => ({
      id: doc.id,
      name: doc.data().name as string,
      description: doc.data().description as string,
      order: Number(doc.data().order) || 0,
    }))
    .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name, 'pt-BR'))
    .map(({ id, name, description }) => ({ id, name, description }));
}

function periodAllowsPeer(data: FirebaseFirestore.DocumentData | undefined) {
  return !Array.isArray(data?.modalities) || data.modalities.includes('PEER');
}

export async function getPeerAccessContext(input: z.infer<typeof peerAccessSchema>): Promise<PeerAccessContext> {
  const registration = normalizeRegistration(input.registration);
  if (!registration) throw new PeerError('Matrícula não encontrada. Confira os dados ou procure o RH/DP.', 404);
  const matches = await adminDb.collection(COWORKERS).where('registrationNormalized', '==', registration).limit(2).get();
  if (matches.size !== 1) throw new PeerError('Matrícula não encontrada. Confira os dados ou procure o RH/DP.', 404);
  const evaluator = matches.docs[0];
  const evaluatorData = evaluator.data();
  if (evaluatorData.active !== true) throw new PeerError('Seu cadastro não está ativo. Procure o RH/DP.', 403);

  const [period, department, people, settings, criteriaSnapshot] = await Promise.all([
    getOpenPeriod(),
    adminDb.collection(COLLECTIONS.DEPARTMENTS).doc(evaluatorData.departmentId).get(),
    adminDb.collection(COWORKERS).where('departmentId', '==', evaluatorData.departmentId).get(),
    getSettings(),
    adminDb.collection(COLLECTIONS.CRITERIA).where('active', '==', true).get(),
  ]);
  if (!period) throw new PeerError('Não há um período aberto para avaliações.', 409);
  if (period.modalities && !period.modalities.includes('PEER')) throw new PeerError('A avaliação entre colegas não está habilitada neste ciclo.', 409);
  if (!department.exists || department.data()!.active === false) throw new PeerError('Seu setor está inativo. Procure o RH/DP.', 403);
  const criteria = mapActivePeerCriteria(criteriaSnapshot);
  if (!criteria.length) throw new PeerError('A avaliação entre colegas ainda não possui critérios ativos.', 503);
  const coworkers = people.docs
    .filter((person) => person.id !== evaluator.id && person.data().active === true)
    .map(mapCoworker)
    .map((person) => ({ ...person, registration: '' }))
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  return {
    participationToken: signParticipationToken({ kind: 'PEER', participantId: evaluator.id, departmentId: evaluatorData.departmentId, periodId: period.id }),
    evaluatorName: evaluatorData.name,
    departmentName: department.data()!.name,
    coworkers,
    period: { id: period.id, name: period.name },
    criteria,
    commentsEnabled: settings.commentsEnabled,
  };
}

export async function getPublicPeerContext(): Promise<PublicPeerContext> {
  const [people, departments, period, settings, criteria] = await Promise.all([
    adminDb.collection(COWORKERS).where('active', '==', true).limit(MAX_PEOPLE + 1).get(),
    getDepartments(true),
    getOpenPeriod(),
    getSettings(),
    getCriteria(true, 'PEER'),
  ]);
  if (people.size > MAX_PEOPLE) throw new PeerError('O cadastro ultrapassou o limite de exibição. Procure o RH/DP.', 503);
  const activeDepartmentIds = new Set(departments.map((department) => department.id));
  return {
    // The public page only receives the count. Names are released after a valid
    // registration is supplied, and only for people in the evaluator's sector.
    availableCoworkers: people.docs
      .map(mapCoworker)
      .filter((person) => activeDepartmentIds.has(person.departmentId)).length,
    departments: departments.map(({ id, name, active }) => ({ id, name, active })),
    period: period && (!period.modalities || period.modalities.includes('PEER')) ? { id: period.id, name: period.name } : null,
    criteria: criteria.map(({ id, name, description }) => ({ id, name, description })),
    commentsEnabled: settings.commentsEnabled,
  };
}

export async function submitOpenPeerEvaluation(input: z.infer<typeof openPeerSubmissionSchema>) {
  let identity;
  try { identity = verifyParticipationToken(input.participationToken, 'PEER'); }
  catch (error) { if (error instanceof ParticipationTokenError) throw new PeerError(error.message, 401); throw error; }
  if (identity.periodId !== input.periodId) throw new PeerError('O período mudou. Informe sua matrícula novamente.', 409);
  const coworkerRef = adminDb.collection(COWORKERS).doc(input.coworkerId);
  const evaluatorRef = adminDb.collection(COWORKERS).doc(identity.participantId);
  const periodRef = adminDb.collection(COLLECTIONS.EVALUATION_PERIODS).doc(input.periodId);
  const settingsRef = adminDb.collection(COLLECTIONS.SETTINGS).doc('app');
  const evaluationRef = adminDb.collection(EVALUATIONS).doc();
  const pairKey = `pair:${input.periodId}:${identity.participantId}:${input.coworkerId}`;
  const participationId = primaryParticipationHash(pairKey);
  const participationRef = adminDb.collection(PARTICIPATION).doc(participationId);
  const participationRefs = participationHashCandidates(pairKey).map((id) => adminDb.collection(PARTICIPATION).doc(id));

  await adminDb.runTransaction(async (transaction) => {
    const [coworker, evaluator] = await Promise.all([transaction.get(coworkerRef), transaction.get(evaluatorRef)]);
    if (!coworker.exists) throw new PeerError('A pessoa selecionada não está disponível. Atualize a página.', 409);
    if (!evaluator.exists || evaluator.data()!.departmentId !== identity.departmentId) {
      throw new PeerError('Seu cadastro foi alterado. Informe sua matrícula novamente.', 409);
    }
    const coworkerData = coworker.data()!;
    const relationshipError = validatePeerRelationship(
      { id: evaluator.id, departmentId: evaluator.data()!.departmentId, active: evaluator.data()!.active === true },
      { id: coworker.id, departmentId: coworkerData.departmentId, active: coworkerData.active === true },
    );
    if (relationshipError) throw new PeerError(relationshipError, 403);
    const [department, period, settings, criteriaSnapshot] = await Promise.all([
      transaction.get(adminDb.collection(COLLECTIONS.DEPARTMENTS).doc(coworkerData.departmentId)),
      transaction.get(periodRef),
      transaction.get(settingsRef),
      transaction.get(adminDb.collection(COLLECTIONS.CRITERIA).where('active', '==', true)),
    ]);
    const previousParticipations = await Promise.all(participationRefs.map((ref) => transaction.get(ref)));
    if (previousParticipations.some((snapshot) => snapshot.exists)) throw new PeerError('Você já avaliou esta pessoa neste ciclo.', 409);
    if (!department.exists || department.data()!.active === false || coworkerData.departmentId !== department.id) {
      throw new PeerError('O setor desta pessoa está indisponível. Atualize a página.', 409);
    }
    if (!validPeriod(period.data()) || !periodAllowsPeer(period.data())) throw new PeerError('O período de avaliação foi encerrado ou esta modalidade está desabilitada.', 409);
    const criteria = mapActivePeerCriteria(criteriaSnapshot);
    const expectedIds = criteria.map((criterion) => criterion.id).sort();
    const receivedIds = Object.keys(input.scores).sort();
    if (!criteria.length || expectedIds.length !== receivedIds.length || expectedIds.some((id, index) => id !== receivedIds[index])) {
      throw new PeerError('Os critérios mudaram enquanto o formulário estava aberto. Atualize a página e responda novamente.', 409);
    }
    if (input.comment && settings.data()?.commentsEnabled === false) throw new PeerError('Os comentários foram desativados pelo RH. Remova o comentário para enviar.');
    const now = new Date();
    transaction.create(evaluationRef, buildAnonymousPeerResponse({
      targetId: coworker.id, targetName: coworkerData.name,
      departmentId: department.id, departmentName: department.data()!.name,
      periodId: period.id, scores: input.scores, criteriaSnapshot: criteria,
      comment: input.comment || null, createdAt: now,
    }));
    // Identity/participation is intentionally stored apart from the anonymous
    // response. Only keyed hashes are kept, without evaluation id or scores.
    transaction.create(participationRef, {
      periodId: period.id,
      departmentId: department.id,
      evaluatorHash: primaryParticipationHash(`person:${evaluator.id}`),
      completedDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now),
    });
  });
  return { submitted: true };
}

export async function getPeerParticipation(periodId: string) {
  const [people, records, departments] = await Promise.all([
    adminDb.collection(COWORKERS).limit(MAX_PEOPLE + 1).get(),
    adminDb.collection(PARTICIPATION).where('periodId', '==', periodId).limit(25001).get(),
    adminDb.collection(COLLECTIONS.DEPARTMENTS).where('active', '==', true).get(),
  ]);
  if (people.size > MAX_PEOPLE || records.size > 25000) throw new PeerError('O volume do período ultrapassou o limite desta consulta.');
  const activeDepartmentIds = new Set(departments.docs.map((department) => department.id));
  const activePeople = people.docs.filter((document) => {
    const data = document.data();
    return data.active === true && Boolean(data.registrationNormalized) && activeDepartmentIds.has(data.departmentId);
  });
  const peoplePerDepartment = new Map<string, number>();
  activePeople.forEach((document) => {
    const departmentId = document.data().departmentId as string;
    peoplePerDepartment.set(departmentId, (peoplePerDepartment.get(departmentId) || 0) + 1);
  });
  const eligiblePeople = activePeople.filter((document) => (peoplePerDepartment.get(document.data().departmentId) || 0) > 1);
  const eligibleHashes = new Set(eligiblePeople.flatMap((document) => participationHashCandidates(`person:${document.id}`)));
  const participantHashes = new Set(records.docs
    .map((document) => document.data().evaluatorHash)
    .filter((hash): hash is string => typeof hash === 'string' && eligibleHashes.has(hash)));
  const eligible = eligiblePeople.length;
  return {
    eligible,
    participants: participantHashes.size,
    evaluations: records.size,
    participationPercent: eligible ? Math.min(100, Math.round(participantHashes.size / eligible * 100)) : 0,
    privacy: 'Somente totais agregados são exibidos. O painel não informa quem avaliou determinada pessoa.',
  };
}

export async function generatePeerLinks(input: z.infer<typeof peerLinkSchema>, actor: { id: string; name: string }): Promise<GeneratedPeerLink[]> {
  const tokens = Array.from({ length: input.count }, () => randomBytes(24).toString('base64url'));
  const links = await adminDb.runTransaction(async (transaction) => {
    const person = await transaction.get(adminDb.collection(COWORKERS).doc(input.coworkerId));
    if (!person.exists || person.data()!.active !== true) throw new PeerError('Selecione um colega ativo.');
    const coworker = person.data()!;
    const [department, period] = await Promise.all([
      transaction.get(adminDb.collection(COLLECTIONS.DEPARTMENTS).doc(coworker.departmentId)),
      transaction.get(adminDb.collection(COLLECTIONS.EVALUATION_PERIODS).doc(input.periodId)),
    ]);
    if (!department.exists || department.data()!.active === false) throw new PeerError('O setor desta pessoa está inativo.');
    if (!validPeriod(period.data())) throw new PeerError('Escolha um período aberto dentro das datas de avaliação.');
    const now = new Date();
    const expiresAt = new Date(Math.min(now.getTime() + input.expiresInDays * 86400000, normalizeStoredPeriodDate(toDate(period.data()!.endDate)!, true).getTime()));
    return tokens.map((token) => {
      const id = hashToken(token);
      const data = { coworkerId: person.id, coworkerName: coworker.name, coworkerRevision: coworker.revision || 1, departmentId: department.id, departmentName: department.data()!.name, periodId: period.id, periodName: period.data()!.name, status: 'PENDING', expiresAt, createdAt: now, createdBy: actor.id };
      transaction.create(adminDb.collection(TOKENS).doc(id), data);
      return { id, token, coworkerName: data.coworkerName, departmentName: data.departmentName, periodName: data.periodName, status: data.status, expiresAt: expiresAt.toISOString() };
    });
  });
  await audit('TOKEN_GENERATED', actor, input.coworkerId, `${input.count} links anônimos de uso único gerados para avaliação de colega.`);
  return links;
}

export async function getPeerLinks(): Promise<PeerLink[]> {
  const [tokens, people, periods, departments] = await Promise.all([
    adminDb.collection(TOKENS).orderBy('createdAt', 'desc').limit(200).get(),
    adminDb.collection(COWORKERS).limit(MAX_PEOPLE).get(), getPeriods(), getDepartments(),
  ]);
  const peopleMap = new Map(people.docs.map((person) => [person.id, person.data()]));
  const periodMap = new Map(periods.map((period) => [period.id, period]));
  const departmentMap = new Map(departments.map((department) => [department.id, department]));
  return tokens.docs.map((doc) => {
    const data = doc.data(), coworker = peopleMap.get(data.coworkerId), period = periodMap.get(data.periodId), department = departmentMap.get(data.departmentId);
    let status = data.status;
    if (status === 'PENDING') {
      if (!coworker?.active || coworker.revision !== data.coworkerRevision || !department?.active) status = 'INVALIDATED';
      else if (!period || !isPeriodAcceptingResponses(period) || (toDate(data.expiresAt)?.getTime() || 0) <= Date.now()) status = 'EXPIRED';
    }
    return { id: doc.id, coworkerName: data.coworkerName, departmentName: data.departmentName, periodName: data.periodName, status, expiresAt: toDate(data.expiresAt)?.toISOString() || '' };
  });
}

export async function cancelPeerLink(id: string, actor: { id: string; name: string }) {
  const ref = adminDb.collection(TOKENS).doc(id);
  await adminDb.runTransaction(async (transaction) => {
    const token = await transaction.get(ref);
    if (!token.exists) throw new PeerError('Link não encontrado.', 404);
    if (token.data()!.status !== 'PENDING') throw new PeerError('Este link já foi respondido ou cancelado.');
    transaction.update(ref, { status: 'INVALIDATED' });
  });
  await audit('TOKEN_INVALIDATED', actor, null, 'Link de avaliação de colega cancelado.');
}

async function getValidContext(transaction: FirebaseFirestore.Transaction, token: string) {
  if (!peerTokenSchema.safeParse(token).success) throw unavailable();
  const tokenRef = adminDb.collection(TOKENS).doc(hashToken(token));
  const snapshot = await transaction.get(tokenRef);
  const data = snapshot.data();
  if (!data || data.status !== 'PENDING' || (toDate(data.expiresAt)?.getTime() || 0) <= Date.now()) throw unavailable();
  const [coworker, period, department] = await Promise.all([
    transaction.get(adminDb.collection(COWORKERS).doc(data.coworkerId)),
    transaction.get(adminDb.collection(COLLECTIONS.EVALUATION_PERIODS).doc(data.periodId)),
    transaction.get(adminDb.collection(COLLECTIONS.DEPARTMENTS).doc(data.departmentId)),
  ]);
  if (!coworker.exists || coworker.data()!.active !== true || coworker.data()!.revision !== data.coworkerRevision || coworker.data()!.departmentId !== data.departmentId || !department.exists || department.data()!.active === false || !validPeriod(period.data())) throw unavailable();
  return { tokenRef, data, coworker, period, department };
}

export async function getPublicPeerTokenContext(token: string) {
  return adminDb.runTransaction(async (transaction) => {
    const { coworker, department, period } = await getValidContext(transaction, token);
    const [settings, criteriaSnapshot] = await Promise.all([
      transaction.get(adminDb.collection(COLLECTIONS.SETTINGS).doc('app')),
      transaction.get(adminDb.collection(COLLECTIONS.CRITERIA).where('active', '==', true)),
    ]);
    const criteria = mapActivePeerCriteria(criteriaSnapshot);
    if (!criteria.length) throw new PeerError('A avaliação entre colegas ainda não possui critérios ativos.', 503);
    return { coworkerName: coworker.data()!.name as string, departmentName: department.data()!.name as string, periodName: period.data()!.name as string, commentsEnabled: settings.data()?.commentsEnabled !== false, criteria };
  });
}

export async function submitPeerEvaluation(input: z.infer<typeof peerSubmissionSchema>) {
  const evaluationRef = adminDb.collection(EVALUATIONS).doc();
  await adminDb.runTransaction(async (transaction) => {
    const { tokenRef, coworker, period, department } = await getValidContext(transaction, input.token);
    const [settings, criteriaSnapshot] = await Promise.all([
      transaction.get(adminDb.collection(COLLECTIONS.SETTINGS).doc('app')),
      transaction.get(adminDb.collection(COLLECTIONS.CRITERIA).where('active', '==', true)),
    ]);
    const criteria = mapActivePeerCriteria(criteriaSnapshot);
    const expectedIds = criteria.map((criterion) => criterion.id).sort();
    const receivedIds = Object.keys(input.scores).sort();
    if (!criteria.length || expectedIds.length !== receivedIds.length || expectedIds.some((id, index) => id !== receivedIds[index])) throw new PeerError('Os critérios mudaram enquanto o formulário estava aberto. Recarregue a página e responda novamente.', 409);
    if (input.comment && settings.data()?.commentsEnabled === false) throw new PeerError('Os comentários foram desativados pelo RH. Remova o comentário para enviar.');
    transaction.create(evaluationRef, {
      coworkerId: coworker.id, coworkerName: coworker.data()!.name,
      departmentId: department.id, departmentName: department.data()!.name,
      periodId: period.id, scores: input.scores, criteriaSnapshot: criteria, comment: input.comment || null,
      createdAt: new Date(),
    });
    // No link identifier, sender identity, IP address or device identifier is stored with the response.
    transaction.update(tokenRef, { status: 'USED' });
  });
  return { submitted: true };
}

export async function getPeerReport(periodId: string): Promise<PeerReport> {
  const [evaluations, settings, configuredCriteria] = await Promise.all([
    adminDb.collection(EVALUATIONS).where('periodId', '==', periodId).limit(25001).get(), getSettings(), getCriteria(false, 'PEER'),
  ]);
  if (evaluations.size > 25000) throw new PeerError('O período ultrapassou o limite desta consulta. Solicite suporte para exportar os resultados completos.');
  const minimum = Math.max(1, Number(settings.minEvaluationsForDisplay) || 5);
  const criteriaMap = new Map<string, PeerCriterion>(configuredCriteria.map(({ id, name, description }) => [id, { id, name, description }]));
  const grouped = new Map<string, { row: PeerReportRow; totals: PeerScores; counts: Record<string, number>; totalScore: number; totalAnswers: number }>();
  for (const doc of evaluations.docs) {
    const data = doc.data();
    const snapshotCriteria: PeerCriterion[] = Array.isArray(data.criteriaSnapshot) && data.criteriaSnapshot.length
      ? data.criteriaSnapshot
      : DEFAULT_PEER_CRITERIA.filter((criterion) => typeof data.scores?.[criterion.id] === 'number').map((criterion) => ({ ...criterion }));
    for (const criterion of snapshotCriteria) if (!criteriaMap.has(criterion.id)) criteriaMap.set(criterion.id, criterion);
    if (!grouped.has(data.coworkerId)) grouped.set(data.coworkerId, {
      row: { coworkerId: data.coworkerId, coworkerName: data.coworkerName, departmentName: data.departmentName, count: 0, average: null, scores: null, comments: [] },
      totals: {}, counts: {}, totalScore: 0, totalAnswers: 0,
    });
    const entry = grouped.get(data.coworkerId)!;
    entry.row.count++;
    for (const criterion of snapshotCriteria) {
      const score = Number(data.scores?.[criterion.id]);
      if (!Number.isInteger(score) || score < 1 || score > 5) continue;
      entry.totals[criterion.id] = (entry.totals[criterion.id] || 0) + score;
      entry.counts[criterion.id] = (entry.counts[criterion.id] || 0) + 1;
      entry.totalScore += score;
      entry.totalAnswers++;
    }
    if (typeof data.comment === 'string' && data.comment.trim()) entry.row.comments.push(data.comment);
  }
  const criteria = [...criteriaMap.values()].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  const rows = [...grouped.values()].map(({ row, totals, counts, totalScore, totalAnswers }) => {
    if (row.count >= minimum) {
      row.scores = Object.fromEntries(criteria.filter((criterion) => counts[criterion.id]).map((criterion) => [criterion.id, Math.round(totals[criterion.id] / counts[criterion.id] * 100) / 100])) as PeerScores;
      row.average = totalAnswers ? Math.round(totalScore / totalAnswers * 100) / 100 : null;
      row.comments.sort((left, right) => left.localeCompare(right, 'pt-BR'));
    } else {
      row.count = 0;
      row.comments = [];
    }
    return row;
  }).sort((left, right) => left.coworkerName.localeCompare(right.coworkerName, 'pt-BR'));
  return { minimum, criteria, rows, total: evaluations.size };
}
