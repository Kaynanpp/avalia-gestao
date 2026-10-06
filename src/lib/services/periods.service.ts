/**
 * Evaluation Periods Service - Server-side
 */

import { cache } from 'react';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import type { EvaluationPeriod, PeriodStatus, CreatePeriodInput } from '@/types';
import { toDate } from '@/lib/utils';
import { createAuditLog } from './audit.service';
import { parsePeriodDate, normalizeStoredPeriodDate, isPeriodAcceptingResponses } from '@/lib/utils/periods';

function mapDocToPeriod(doc: FirebaseFirestore.DocumentSnapshot): EvaluationPeriod {
  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    startDate: normalizeStoredPeriodDate(toDate(data.startDate) || new Date(0)),
    endDate: normalizeStoredPeriodDate(toDate(data.endDate) || new Date(0), true),
    status: data.status as PeriodStatus,
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
    openedAt: toDate(data.openedAt) || undefined,
    closedAt: toDate(data.closedAt) || undefined,
    openedBy: data.openedBy,
    closedBy: data.closedBy,
    modalities: Array.isArray(data.modalities) && data.modalities.length ? data.modalities : ['LEADERSHIP', 'PEER'],
    leadershipParticipationRequired: data.leadershipParticipationRequired === true,
    participationEnforcedAt: toDate(data.participationEnforcedAt) || undefined,
  };
}

async function readPeriods(): Promise<EvaluationPeriod[]> {
  const snapshot = await adminDb
    .collection(COLLECTIONS.EVALUATION_PERIODS)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(mapDocToPeriod);
}

export const getPeriods = cache(readPeriods);

export async function getPeriodsWithMetrics(): Promise<EvaluationPeriod[]> {
  const periods = await getPeriods();
  return Promise.all(periods.map(async (period) => {
    const leadershipQuery = adminDb.collection(COLLECTIONS.EVALUATIONS).where('periodId', '==', period.id);
    const [leadership, leadershipParticipation, peers, participation] = await Promise.all([
      leadershipQuery.get(),
      adminDb.collection(COLLECTIONS.LEADERSHIP_PARTICIPATION).where('periodId', '==', period.id).get(),
      adminDb.collection('peerEvaluations').where('periodId', '==', period.id).count().get(),
      adminDb.collection(COLLECTIONS.PEER_PARTICIPATION).where('periodId', '==', period.id).get(),
    ]);
    const participants = new Set(participation.docs.map((document) => document.data().evaluatorHash).filter(Boolean)).size;
    const leadershipParticipants = new Set(leadershipParticipation.docs.map((document) => document.data().participantHash).filter(Boolean)).size;
    const leadershipEvaluations = period.leadershipParticipationRequired
      ? leadership.docs.filter((document) => document.data().participationVerified === true).length
      : leadership.size;
    return { ...period, metrics: { leadershipEvaluations, leadershipParticipants, peerEvaluations: peers.data().count, peerParticipants: participants } };
  }));
}

export async function getPeriodById(id: string): Promise<EvaluationPeriod | null> {
  const doc = await adminDb.collection(COLLECTIONS.EVALUATION_PERIODS).doc(id).get();
  if (!doc.exists) return null;
  return mapDocToPeriod(doc);
}

export async function getOpenPeriod(): Promise<EvaluationPeriod | null> {
  const snapshot = await adminDb
    .collection(COLLECTIONS.EVALUATION_PERIODS)
    .where('status', '==', 'OPEN')
    .get();

  return snapshot.docs.map(mapDocToPeriod).find((period) => isPeriodAcceptingResponses(period)) || null;
}

export async function createPeriod(
  input: CreatePeriodInput,
  performedBy: string,
  performedByName?: string
): Promise<EvaluationPeriod> {
  const now = new Date();
  const startDate = parsePeriodDate(input.startDate);
  const endDate = parsePeriodDate(input.endDate, true);
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate) {
    throw new Error('Informe datas válidas; o fim deve ocorrer após o início.');
  }
  const data = {
    name: input.name,
    description: input.description || null,
    startDate,
    endDate,
    status: 'DRAFT' as PeriodStatus,
    modalities: input.modalities?.length ? input.modalities : (['LEADERSHIP', 'PEER'] as Array<'LEADERSHIP' | 'PEER'>),
    leadershipParticipationRequired: true,
    participationEnforcedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await adminDb.collection(COLLECTIONS.EVALUATION_PERIODS).add(data);

  await createAuditLog({
    action: 'PERIOD_CREATED',
    entityType: 'evaluationPeriods',
    entityId: docRef.id,
    description: `Período "${input.name}" criado`,
    performedBy,
    performedByName,
  });

  return { id: docRef.id, ...data, description: data.description || undefined };
}

export async function openPeriod(
  id: string,
  performedBy: string,
  performedByName?: string
): Promise<EvaluationPeriod> {
  const period = await getPeriodById(id);
  if (!period) throw new Error('Período não encontrado');
  if (period.status === 'OPEN') throw new Error('Período já está aberto');
  if (period.status === 'CLOSED') throw new Error('Período encerrado não pode ser reaberto');

  const now = new Date();
  const periodRef = adminDb.collection(COLLECTIONS.EVALUATION_PERIODS).doc(id);
  const controlRef = adminDb.collection(COLLECTIONS.SETTINGS).doc('periodControl');
  await adminDb.runTransaction(async (transaction) => {
    const [fresh, existingOpen] = await Promise.all([
      transaction.get(periodRef),
      transaction.get(adminDb.collection(COLLECTIONS.EVALUATION_PERIODS).where('status', '==', 'OPEN')),
      transaction.get(controlRef),
    ]);
    if (!fresh.exists || fresh.data()?.status !== 'DRAFT') throw new Error('Somente períodos em rascunho podem ser abertos.');
    const current = mapDocToPeriod(fresh);
    if (!isPeriodAcceptingResponses({ ...current, status: 'OPEN' })) throw new Error('O período só pode ser aberto entre suas datas de início e fim.');
    if (!existingOpen.empty) throw new Error('Encerre o período aberto antes de abrir outro.');
    transaction.update(periodRef, { status: 'OPEN', openedAt: now, openedBy: performedBy, updatedAt: now });
    transaction.set(controlRef, { openPeriodId: id, updatedAt: now });
  });

  await createAuditLog({
    action: 'PERIOD_OPENED',
    entityType: 'evaluationPeriods',
    entityId: id,
    description: `Período "${period.name}" aberto para avaliações`,
    performedBy,
    performedByName,
  });

  return { ...period, status: 'OPEN', openedAt: now, openedBy: performedBy, updatedAt: now };
}

export async function closePeriod(
  id: string,
  performedBy: string,
  performedByName?: string
): Promise<EvaluationPeriod> {
  const period = await getPeriodById(id);
  if (!period) throw new Error('Período não encontrado');
  if (period.status !== 'OPEN') throw new Error('Somente períodos abertos podem ser encerrados');

  const now = new Date();
  const periodRef = adminDb.collection(COLLECTIONS.EVALUATION_PERIODS).doc(id);
  const controlRef = adminDb.collection(COLLECTIONS.SETTINGS).doc('periodControl');
  await adminDb.runTransaction(async (transaction) => {
    const [fresh] = await Promise.all([transaction.get(periodRef), transaction.get(controlRef)]);
    if (!fresh.exists || fresh.data()?.status !== 'OPEN') throw new Error('Somente períodos abertos podem ser encerrados.');
    transaction.update(periodRef, { status: 'CLOSED', closedAt: now, closedBy: performedBy, updatedAt: now });
    transaction.set(controlRef, { openPeriodId: null, updatedAt: now });
  });

  await createAuditLog({
    action: 'PERIOD_CLOSED',
    entityType: 'evaluationPeriods',
    entityId: id,
    description: `Período "${period.name}" encerrado`,
    performedBy,
    performedByName,
  });

  return { ...period, status: 'CLOSED', closedAt: now, closedBy: performedBy, updatedAt: now };
}

export async function updatePeriod(
  id: string,
  input: { name?: string; description?: string; startDate?: string; endDate?: string; modalities?: Array<'LEADERSHIP' | 'PEER'> },
  performedBy: string,
  performedByName?: string
): Promise<EvaluationPeriod> {
  const period = await getPeriodById(id);
  if (!period) throw new Error('Período não encontrado');
  if (period.status === 'CLOSED') throw new Error('Período encerrado não pode ser editado');

  const startDate = input.startDate ? parsePeriodDate(input.startDate) : period.startDate;
  const endDate = input.endDate ? parsePeriodDate(input.endDate, true) : period.endDate;
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate) {
    throw new Error('Data de fim deve ser posterior à data de início');
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.startDate) updateData.startDate = startDate;
  if (input.endDate) updateData.endDate = endDate;
  if (input.modalities) updateData.modalities = input.modalities;

  const ref = adminDb.collection(COLLECTIONS.EVALUATION_PERIODS).doc(id);
  await adminDb.runTransaction(async (transaction) => {
    const fresh = await transaction.get(ref);
    if (!fresh.exists || fresh.data()?.status === 'CLOSED') throw new Error('Período encerrado não pode ser editado.');
    const latest = mapDocToPeriod(fresh);
    const start = input.startDate ? startDate : latest.startDate;
    const end = input.endDate ? endDate : latest.endDate;
    if (end <= start) throw new Error('Data de fim deve ser posterior à data de início.');
    transaction.update(ref, updateData);
  });

  await createAuditLog({
    action: 'PERIOD_UPDATED',
    entityType: 'evaluationPeriods',
    entityId: id,
    description: `Período "${period.name}" atualizado`,
    performedBy,
    performedByName,
    metadata: { changes: input },
  });

  return { ...period, ...updateData, id } as EvaluationPeriod;
}
