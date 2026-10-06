import type { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { getActiveCriteria } from '@/lib/services/criteria.service';
import { getDepartments } from '@/lib/services/departments.service';
import { getManagers } from '@/lib/services/managers.service';
import { getOpenPeriod } from '@/lib/services/periods.service';
import { getSettings } from '@/lib/services/settings.service';
import { normalizeRegistration } from '@/lib/peer/types';
import { PeerError } from '@/lib/peer/http';
import { leadershipAccessSchema } from '@/lib/validators';
import { participationHashCandidates, signParticipationToken } from '@/lib/participation-security';
import { leadershipPairKey } from './participation';
import type { LeadershipAccessContext, PublicLeadershipContext } from './types';

const COWORKERS = 'coworkers';
const MAX_PEOPLE = 5000;

export async function getPublicLeadershipContext(): Promise<PublicLeadershipContext> {
  const [people, departments, period, settings, criteria] = await Promise.all([
    adminDb.collection(COWORKERS).where('active', '==', true).limit(MAX_PEOPLE + 1).get(),
    getDepartments(true), getOpenPeriod(), getSettings(), getActiveCriteria(),
  ]);
  if (people.size > MAX_PEOPLE) throw new PeerError('O cadastro ultrapassou o limite de participantes.', 503);
  const activeDepartmentIds = new Set(departments.map((department) => department.id));
  return {
    availableParticipants: people.docs.filter((person) => Boolean(person.data().registrationNormalized) && activeDepartmentIds.has(person.data().departmentId)).length,
    period: period && (!period.modalities || period.modalities.includes('LEADERSHIP')) ? { id: period.id, name: period.name } : null,
    criteria: criteria.map(({ id, name, description }) => ({ id, name, description })),
    commentsEnabled: settings.commentsEnabled,
  };
}

export async function getLeadershipAccessContext(input: z.infer<typeof leadershipAccessSchema>): Promise<LeadershipAccessContext> {
  const registration = normalizeRegistration(input.registration);
  if (!registration) throw new PeerError('Matrícula não encontrada. Confira os dados ou procure o RH/DP.', 404);
  const matches = await adminDb.collection(COWORKERS).where('registrationNormalized', '==', registration).limit(2).get();
  if (matches.size !== 1) throw new PeerError('Matrícula não encontrada. Confira os dados ou procure o RH/DP.', 404);
  const participant = matches.docs[0];
  const participantData = participant.data();
  if (participantData.active !== true) throw new PeerError('Seu cadastro não está ativo. Procure o RH/DP.', 403);

  const [period, department, managers, criteria, settings] = await Promise.all([
    getOpenPeriod(),
    adminDb.collection(COLLECTIONS.DEPARTMENTS).doc(participantData.departmentId).get(),
    getManagers({ status: 'ACTIVE', departmentId: participantData.departmentId }),
    getActiveCriteria(), getSettings(),
  ]);
  if (!period) throw new PeerError('Não há um período aberto para avaliações.', 409);
  if (period.modalities && !period.modalities.includes('LEADERSHIP')) throw new PeerError('A avaliação de lideranças não está habilitada neste ciclo.', 409);
  if (!department.exists || department.data()!.active === false) throw new PeerError('Seu setor está inativo. Procure o RH/DP.', 403);
  if (!criteria.length) throw new PeerError('A avaliação de lideranças ainda não possui critérios ativos.', 503);

  const completionRefs = managers.flatMap((manager) => participationHashCandidates(leadershipPairKey(period.id, participant.id, manager.id))
    .map((id) => adminDb.collection(COLLECTIONS.LEADERSHIP_PARTICIPATION).doc(id)));
  const completionSnapshots = completionRefs.length ? await adminDb.getAll(...completionRefs) : [];
  const completedIds = new Set(completionSnapshots.filter((snapshot) => snapshot.exists).map((snapshot) => snapshot.id));

  return {
    participationToken: signParticipationToken({
      kind: 'LEADERSHIP', participantId: participant.id,
      departmentId: participantData.departmentId, periodId: period.id,
    }),
    participantName: participantData.name,
    departmentName: department.data()!.name,
    leaders: managers.map((manager) => ({
      id: manager.id, name: manager.name, position: manager.position,
      departmentId: manager.departmentId, departmentName: manager.departmentName || department.data()!.name,
      completed: participationHashCandidates(leadershipPairKey(period.id, participant.id, manager.id)).some((id) => completedIds.has(id)),
    })),
    period: { id: period.id, name: period.name },
    criteria: criteria.map(({ id, name, description }) => ({ id, name, description })),
    commentsEnabled: settings.commentsEnabled,
  };
}

export async function getLeadershipParticipationSummary(periodId: string) {
  const [people, records, departments, managers] = await Promise.all([
    adminDb.collection(COWORKERS).where('active', '==', true).limit(MAX_PEOPLE + 1).get(),
    adminDb.collection(COLLECTIONS.LEADERSHIP_PARTICIPATION).where('periodId', '==', periodId).limit(25001).get(),
    adminDb.collection(COLLECTIONS.DEPARTMENTS).where('active', '==', true).get(),
    adminDb.collection(COLLECTIONS.MANAGERS).where('status', '==', 'ACTIVE').get(),
  ]);
  if (people.size > MAX_PEOPLE || records.size > 25000) throw new Error('O volume de participação ultrapassou o limite da consulta.');
  const activeDepartments = new Set(departments.docs.map((department) => department.id));
  const departmentsWithLeadership = new Set(managers.docs.map((manager) => manager.data().departmentId).filter(Boolean));
  const eligible = people.docs.filter((person) => {
    const data = person.data();
    return Boolean(data.registrationNormalized) && activeDepartments.has(data.departmentId) && departmentsWithLeadership.has(data.departmentId);
  }).length;
  const participants = new Set(records.docs.map((record) => record.data().participantHash).filter(Boolean)).size;
  return {
    eligible,
    participants,
    evaluations: records.size,
    participationPercent: eligible ? Math.round(participants / eligible * 100) : null,
  };
}
