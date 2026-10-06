/** Server-side reports for leadership evaluations. Historical SELF data is preserved separately. */
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import type { ManagerResult, DashboardStats, ReportFilters, Evaluation, Criterion, Manager } from '@/types';
import { toDate } from '@/lib/utils';
import { getManagers } from './managers.service';
import { getPeriods } from './periods.service';
import { getCriteria } from './criteria.service';
import { isPeriodAcceptingResponses } from '@/lib/utils/periods';
import {
  calculateManagerTeamAverage,
  calculateCriteriaResults,
  calculateOverallTeamAverage,
  hasEnoughDataForDisplay,
} from '@/lib/calculations';
export { getSettings, updateSettings } from './settings.service';

// Query only the leadership collection. Do not load the retired SELF collection.
async function getLeadershipEvaluations(periodId: string, managerId?: string, participationRequiredOverride?: boolean): Promise<Evaluation[]> {
  let evaluationsQuery: FirebaseFirestore.Query = adminDb.collection(COLLECTIONS.EVALUATIONS).where('periodId', '==', periodId);
  if (managerId) evaluationsQuery = evaluationsQuery.where('managerId', '==', managerId);
  const [snapshot, period] = await Promise.all([
    evaluationsQuery.get(),
    participationRequiredOverride === undefined
      ? adminDb.collection(COLLECTIONS.EVALUATION_PERIODS).doc(periodId).get()
      : Promise.resolve(null),
  ]);
  const participationRequired = participationRequiredOverride ?? period?.data()?.leadershipParticipationRequired === true;
  return snapshot.docs.flatMap((doc) => {
    const data = doc.data();
    if (data.evaluationType !== 'TEAM' || (participationRequired && data.participationVerified !== true) || (managerId && data.managerId !== managerId)) return [];
    return [{
      id: doc.id,
      managerId: data.managerId,
      periodId: data.periodId,
      evaluationType: 'TEAM' as const,
      answers: data.answers || [],
      overallScore: data.overallScore || 0,
      createdAt: toDate(data.createdAt) || new Date(),
      participationVerified: data.participationVerified === true,
    }];
  });
}

function buildResult(manager: Manager, evaluations: Evaluation[], criteria: Criterion[], minEvaluations: number): ManagerResult {
  const hasEnoughData = hasEnoughDataForDisplay(evaluations.length, minEvaluations);
  // Keep retired criteria in historical reports when they were answered in the period.
  const answeredIds = new Set(evaluations.flatMap((evaluation) => evaluation.answers.map((answer) => answer.criterionId)));
  const criteriaIds = [...new Set([
    ...criteria.filter((criterion) => criterion.active || answeredIds.has(criterion.id)).map((criterion) => criterion.id),
    ...answeredIds,
  ])];
  const names = Object.fromEntries(criteria.map((criterion) => [criterion.id, criterion.name]));
  const criteriaResults = calculateCriteriaResults(evaluations, [], criteriaIds, names).map((criterion) => {
    // A criterion added mid-period may have fewer responses than the leadership total.
    if (hasEnoughData && criterion.teamCount >= minEvaluations) return criterion;
    return {
      ...criterion,
      teamAverage: null,
      teamCount: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  });
  return {
    managerId: manager.id,
    managerName: manager.name,
    departmentName: manager.departmentName || '',
    position: manager.position,
    status: manager.status,
    teamEvaluationCount: evaluations.length,
    teamOverallAverage: hasEnoughData ? calculateManagerTeamAverage(evaluations) : null,
    hasEnoughData,
    criteriaResults,
    // Compatibility fields stay empty; historical SELF scores are never relabeled as peers.
    selfEvaluationCount: 0,
    selfOverallAverage: null,
    difference: null,
  };
}

export async function getManagerResult(managerId: string, periodId: string, minEvaluations = 5): Promise<ManagerResult | null> {
  const [managers, criteria, evaluations] = await Promise.all([
    getManagers(), getCriteria(false), getLeadershipEvaluations(periodId, managerId),
  ]);
  const manager = managers.find((entry) => entry.id === managerId);
  return manager ? buildResult(manager, evaluations, criteria, minEvaluations) : null;
}

export async function getAllManagerResults(periodId: string, filters: ReportFilters = {}, minEvaluations = 5): Promise<ManagerResult[]> {
  const [managers, criteria, evaluations] = await Promise.all([
    getManagers(filters.status ? { status: filters.status } : undefined),
    getCriteria(false),
    getLeadershipEvaluations(periodId),
  ]);
  const grouped = new Map<string, Evaluation[]>();
  for (const evaluation of evaluations) {
    const group = grouped.get(evaluation.managerId) || [];
    group.push(evaluation);
    grouped.set(evaluation.managerId, group);
  }
  return managers
    .filter((manager) => (!filters.managerId || manager.id === filters.managerId)
      && (!filters.departmentId || manager.departmentId === filters.departmentId))
    .map((manager) => buildResult(manager, grouped.get(manager.id) || [], criteria, minEvaluations));
}

export async function getManagerPeriodHistory(managerId: string, minEvaluations = 5) {
  const periods = (await getPeriods()).filter((period) => period.status !== 'DRAFT').sort((left, right) => left.startDate.getTime() - right.startDate.getTime());
  const periodMap = new Map(periods.map((period) => [period.id, period]));
  const snapshot = await adminDb.collection(COLLECTIONS.EVALUATIONS).where('managerId', '==', managerId).get();
  const grouped = new Map<string, Evaluation[]>();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const period = periodMap.get(data.periodId);
    if (!period || data.evaluationType !== 'TEAM' || (period.leadershipParticipationRequired && data.participationVerified !== true)) continue;
    const group = grouped.get(period.id) || [];
    group.push({
      id: doc.id,
      managerId: data.managerId,
      periodId: data.periodId,
      evaluationType: 'TEAM',
      answers: data.answers || [],
      overallScore: data.overallScore || 0,
      createdAt: toDate(data.createdAt) || new Date(),
      participationVerified: data.participationVerified === true,
    });
    grouped.set(period.id, group);
  }
  const history = periods.map((period) => {
    const evaluations = grouped.get(period.id) || [];
    const visible = hasEnoughDataForDisplay(evaluations.length, minEvaluations);
    return {
      periodId: period.id,
      periodName: period.name,
      teamAverage: visible ? calculateManagerTeamAverage(evaluations) : null,
      selfAverage: null,
      evaluationCount: visible ? evaluations.length : 0,
    };
  });
  return history;
}

export async function getDashboardStats(minEvaluations = 5): Promise<DashboardStats> {
  const [managers, totalCount, coworkerSnapshot, departments, periods] = await Promise.all([
    getManagers(),
    adminDb.collection(COLLECTIONS.EVALUATIONS).where('evaluationType', '==', 'TEAM').count().get(),
    adminDb.collection('coworkers').get(),
    adminDb.collection(COLLECTIONS.DEPARTMENTS).where('active', '==', true).get(),
    getPeriods(),
  ]);
  const currentPeriod = periods.find((period) => period.status === 'OPEN' && isPeriodAcceptingResponses(period)) || null;
  const previousPeriod = periods.find((period) => period.id !== currentPeriod?.id && period.status === 'CLOSED');
  const [evaluations, previous, leadershipParticipationSnapshot, peerEvaluationsSnapshot, participationSnapshot] = await Promise.all([
    currentPeriod ? getLeadershipEvaluations(currentPeriod.id, undefined, currentPeriod.leadershipParticipationRequired) : Promise.resolve([]),
    previousPeriod ? getLeadershipEvaluations(previousPeriod.id, undefined, previousPeriod.leadershipParticipationRequired) : Promise.resolve([]),
    currentPeriod ? adminDb.collection(COLLECTIONS.LEADERSHIP_PARTICIPATION).where('periodId', '==', currentPeriod.id).get() : Promise.resolve(null),
    currentPeriod ? adminDb.collection('peerEvaluations').where('periodId', '==', currentPeriod.id).count().get() : Promise.resolve(null),
    currentPeriod ? adminDb.collection(COLLECTIONS.PEER_PARTICIPATION).where('periodId', '==', currentPeriod.id).get() : Promise.resolve(null),
  ]);
  const counts = new Map<string, number>();
  for (const evaluation of evaluations) counts.set(evaluation.managerId, (counts.get(evaluation.managerId) || 0) + 1);
  // Global scores must not reveal protected groups by subtraction from visible groups.
  const visibleEvaluations = evaluations.filter((evaluation) => (counts.get(evaluation.managerId) || 0) >= minEvaluations);
  const currentAverage = calculateOverallTeamAverage(visibleEvaluations);
  let previousPeriodAverage: number | null = null;
  if (previousPeriod) {
    const previousCounts = new Map<string, number>();
    previous.forEach((evaluation) => previousCounts.set(evaluation.managerId, (previousCounts.get(evaluation.managerId) || 0) + 1));
    previousPeriodAverage = calculateOverallTeamAverage(previous.filter((evaluation) => (previousCounts.get(evaluation.managerId) || 0) >= minEvaluations));
  }
  const criterionGroups = new Map<string, { name: string; scores: number[] }>();
  for (const evaluation of visibleEvaluations) for (const answer of evaluation.answers) {
    if (!Number.isInteger(answer.score) || answer.score < 1 || answer.score > 5) continue;
    const group = criterionGroups.get(answer.criterionId) || { name: answer.criterionName || answer.criterionId, scores: [] };
    group.scores.push(answer.score); criterionGroups.set(answer.criterionId, group);
  }
  const criterionAverages = [...criterionGroups.values()].map((group) => ({ name: group.name, average: group.scores.reduce((sum, score) => sum + score, 0) / group.scores.length })).sort((left, right) => right.average - left.average);
  const peerParticipants = new Set(participationSnapshot?.docs.map((document) => document.data().evaluatorHash).filter(Boolean) || []).size;
  const eligibleCoworkers = coworkerSnapshot.docs.filter((document) => document.data().active === true && document.data().registrationNormalized).length;
  const participationPercent = eligibleCoworkers ? Math.round(peerParticipants / eligibleCoworkers * 100) : null;
  const eligibleByDepartment = new Map<string, number>();
  coworkerSnapshot.docs.filter((document) => document.data().active === true && document.data().registrationNormalized).forEach((document) => {
    const id = document.data().departmentId as string;
    eligibleByDepartment.set(id, (eligibleByDepartment.get(id) || 0) + 1);
  });
  const participantsByDepartment = new Map<string, Set<string>>();
  participationSnapshot?.docs.forEach((document) => {
    const data = document.data();
    const group = participantsByDepartment.get(data.departmentId) || new Set<string>();
    if (data.evaluatorHash) group.add(data.evaluatorHash); participantsByDepartment.set(data.departmentId, group);
  });
  const departmentNames = new Map(departments.docs.map((document) => [document.id, document.data().name as string]));
  const departmentRates = [...eligibleByDepartment].map(([id, eligible]) => ({ id, name: departmentNames.get(id) || 'Setor', rate: Math.round((participantsByDepartment.get(id)?.size || 0) / eligible * 100) })).sort((left, right) => left.rate - right.rate);
  const activeDepartmentIds = new Set(departments.docs.map((department) => department.id));
  const departmentsWithLeadership = new Set(managers.filter((manager) => manager.status === 'ACTIVE').map((manager) => manager.departmentId));
  const leadershipEligible = coworkerSnapshot.docs.filter((person) => {
    const data = person.data();
    return data.active === true && Boolean(data.registrationNormalized) && activeDepartmentIds.has(data.departmentId) && departmentsWithLeadership.has(data.departmentId);
  }).length;
  const leadershipParticipants = new Set(leadershipParticipationSnapshot?.docs.map((record) => record.data().participantHash).filter(Boolean) || []).size;
  const leadershipParticipationPercent = leadershipEligible ? Math.round(leadershipParticipants / leadershipEligible * 100) : null;
  const averageVariation = currentAverage !== null && previousPeriodAverage !== null ? Math.round((currentAverage - previousPeriodAverage) * 100) / 100 : null;
  const insights: string[] = [];
  if (!currentPeriod) insights.push('Não há ciclo aberto. Planeje ou abra um período para começar o acompanhamento.');
  else {
    if (averageVariation !== null) insights.push(`A média geral ${Math.abs(averageVariation) < 0.05 ? 'permaneceu estável' : averageVariation > 0 ? `subiu ${averageVariation.toFixed(2)} ponto` : `caiu ${Math.abs(averageVariation).toFixed(2)} ponto`} em relação ao ciclo anterior.`);
    if (criterionAverages.length) insights.push(`${criterionAverages[criterionAverages.length - 1].name} é o critério com menor média disponível neste ciclo (${criterionAverages[criterionAverages.length - 1].average.toFixed(2)}).`);
    if (participationPercent !== null && participationPercent < 70) insights.push(`A participação entre colegas está em ${participationPercent}%, abaixo da referência operacional de 70%.`);
    if (participationPercent !== null && departmentRates[0] && departmentRates[0].rate < participationPercent) insights.push(`${departmentRates[0].name} apresenta participação de ${departmentRates[0].rate}%, abaixo da média geral de ${participationPercent}%.`);
    if (!visibleEvaluations.length) insights.push(`Ainda não há grupos com o mínimo de ${minEvaluations} respostas para gerar resultados do ciclo.`);
  }
  return {
    totalManagers: managers.length,
    activeManagers: managers.filter((manager) => manager.status === 'ACTIVE').length,
    evaluatedManagers: counts.size,
    totalTeamEvaluations: totalCount.data().count,
    totalSelfEvaluations: 0,
    teamOverallAverage: currentAverage,
    currentPeriod: currentPeriod || undefined,
    currentPeriodTeamEvaluations: evaluations.length,
    currentPeriodSelfEvaluations: 0,
    totalCoworkers: coworkerSnapshot.size,
    totalDepartments: departments.size,
    peerEvaluations: peerEvaluationsSnapshot?.data().count || 0,
    peerParticipants,
    leadershipParticipants,
    leadershipParticipationPercent,
    participationPercent,
    previousPeriodAverage,
    averageVariation,
    strongestCriterion: criterionAverages[0],
    attentionCriterion: criterionAverages[criterionAverages.length - 1],
    insights,
  };
}

