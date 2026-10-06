import { logError } from '@/lib/observability/logger';
/**
 * Evaluations Service - Server-side
 * Handles both team evaluations (anonymous) and self-evaluations (via token)
 */

import { adminDb } from '@/lib/firebase/admin';
import { createHash, randomBytes } from 'crypto';
import { COLLECTIONS, DEFAULTS } from '@/lib/firebase/collections';
import type {
  Evaluation,
  EvaluationAnswer,
  EvaluationType,
  SubmitEvaluationDTO,
  SubmitSelfEvaluationDTO,
  SelfEvaluationToken,
  GenerateTokenInput,
} from '@/types';
import { toDate } from '@/lib/utils';
import { createAuditLog } from './audit.service';
import { getPeriodById, getOpenPeriod } from './periods.service';
import { getManagerById } from './managers.service';
import { getSettings } from './settings.service';
import { getActiveCriteria } from './criteria.service';
import { validateAnswers } from '@/lib/calculations';
import { isPeriodAcceptingResponses, normalizeStoredPeriodDate } from '@/lib/utils/periods';
import { criterionMatchesModality } from '@/lib/criteria-modality';
import { ParticipationTokenError, participationHashCandidates, primaryParticipationHash, verifyParticipationToken } from '@/lib/participation-security';
import { buildAnonymousLeadershipResponse, leadershipPairKey, validateLeadershipRelationship } from '@/lib/leadership/participation';

// ── Helpers ───────────────────────────────────────────────────

function mapDocToEvaluation(doc: FirebaseFirestore.DocumentSnapshot): Evaluation {
  const data = doc.data()!;
  return {
    id: doc.id,
    managerId: data.managerId,
    periodId: data.periodId,
    evaluationType: data.evaluationType as EvaluationType,
    answers: data.answers || [],
    overallScore: data.overallScore || 0,
    comment: data.comment || undefined,
    createdAt: toDate(data.createdAt) || new Date(),
    participationVerified: data.participationVerified === true,
  };
}

function mapDocToToken(doc: FirebaseFirestore.DocumentSnapshot): SelfEvaluationToken {
  const data = doc.data()!;
  return {
    id: doc.id,
    token: data.token || '',
    managerId: data.managerId,
    periodId: data.periodId,
    status: data.status,
    maxUses: data.maxUses,
    usedCount: data.usedCount,
    expiresAt: toDate(data.expiresAt) || new Date(),
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
    createdBy: data.createdBy,
    usedAt: toDate(data.usedAt) || undefined,
  };
}

function hashSelfEvaluationToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

class SelfEvaluationRejected extends Error {}
class TeamEvaluationRejected extends Error {}
const periodAllowsLeadership = (period: { modalities?: unknown }) => !Array.isArray(period.modalities) || period.modalities.includes('LEADERSHIP');

// ── Rate Limiting / Dedup ─────────────────────────────────────

const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10');
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');

// ── Team Evaluations ──────────────────────────────────────────

export async function submitTeamEvaluation(
  dto: SubmitEvaluationDTO
): Promise<{ success: boolean; error?: string; status?: number }> {
  try {
    let identity;
    try { identity = verifyParticipationToken(dto.participationToken, 'LEADERSHIP'); }
    catch (error) {
      if (error instanceof ParticipationTokenError) return { success: false, error: error.message, status: 401 };
      throw error;
    }
    if (identity.periodId !== dto.periodId) return { success: false, error: 'O período mudou. Informe sua matrícula novamente.', status: 409 };

    const participantRef = adminDb.collection('coworkers').doc(identity.participantId);
    const managerRef = adminDb.collection(COLLECTIONS.MANAGERS).doc(dto.managerId);
    const periodRef = adminDb.collection(COLLECTIONS.EVALUATION_PERIODS).doc(dto.periodId);
    const departmentRef = adminDb.collection(COLLECTIONS.DEPARTMENTS).doc(identity.departmentId);
    const evaluationRef = adminDb.collection(COLLECTIONS.EVALUATIONS).doc();
    const pairKey = leadershipPairKey(dto.periodId, identity.participantId, dto.managerId);
    const participationRef = adminDb.collection(COLLECTIONS.LEADERSHIP_PARTICIPATION).doc(primaryParticipationHash(pairKey));
    const participationRefs = participationHashCandidates(pairKey).map((id) => adminDb.collection(COLLECTIONS.LEADERSHIP_PARTICIPATION).doc(id));
    const rateLimitRef = adminDb.collection(COLLECTIONS.SUBMISSION_TOKENS).doc(primaryParticipationHash(`leadership-rate:${dto.periodId}:${identity.participantId}`));
    const now = new Date();
    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW);

    await adminDb.runTransaction(async (transaction) => {
      const [participant, latestManager, rateLimitSnapshot, latestPeriod, department, latestCriteria, settings] = await Promise.all([
        transaction.get(participantRef),
        transaction.get(managerRef),
        transaction.get(rateLimitRef),
        transaction.get(periodRef),
        transaction.get(departmentRef),
        transaction.get(adminDb.collection(COLLECTIONS.CRITERIA).where('active', '==', true)),
        transaction.get(adminDb.collection(COLLECTIONS.SETTINGS).doc('app')),
      ]);
      const previousParticipations = await Promise.all(participationRefs.map((ref) => transaction.get(ref)));

      if (previousParticipations.some((snapshot) => snapshot.exists)) {
        throw new TeamEvaluationRejected('Você já avaliou esta liderança neste ciclo.');
      }
      if (!participant.exists || participant.data()!.departmentId !== identity.departmentId) {
        throw new TeamEvaluationRejected('Seu cadastro foi alterado. Informe sua matrícula novamente.');
      }
      const participantData = participant.data()!;
      if (!latestManager.exists || latestManager.data()!.status !== 'ACTIVE') {
        throw new TeamEvaluationRejected('A liderança selecionada não está disponível para avaliação.');
      }
      const relationshipError = validateLeadershipRelationship(
        { id: participant.id, departmentId: participantData.departmentId, active: participantData.active === true },
        { id: latestManager.id, departmentId: latestManager.data()!.departmentId, active: latestManager.data()!.status === 'ACTIVE' },
      );
      if (relationshipError) throw new TeamEvaluationRejected(relationshipError);
      if (!department.exists || department.data()?.active === false) throw new TeamEvaluationRejected('Seu setor está inativo. Procure o RH/DP.');
      const periodData = latestPeriod.data();
      if (!periodData || !periodAllowsLeadership(periodData) || !isPeriodAcceptingResponses({
        status: periodData.status,
        startDate: normalizeStoredPeriodDate(toDate(periodData.startDate) || new Date(0)),
        endDate: normalizeStoredPeriodDate(toDate(periodData.endDate) || new Date(0), true),
      })) {
        throw new TeamEvaluationRejected('O período de avaliação foi encerrado ou está fora das datas permitidas.');
      }
      // This query also returns active PEER criteria. Validate only the same
      // leadership criteria rendered by getActiveCriteria() on the form.
      const latestLeadershipCriteria = latestCriteria.docs.filter((criterion) =>
        criterionMatchesModality(criterion.data().modality, 'LEADERSHIP')
      );
      const freshValidation = validateAnswers(dto.answers, latestLeadershipCriteria.map((criterion) => criterion.id));
      if (!freshValidation.valid) throw new TeamEvaluationRejected('Os critérios foram alterados. Atualize a página antes de enviar.');
      if (dto.comment && settings.data()?.commentsEnabled === false) throw new TeamEvaluationRejected('Os comentários foram desativados pelo RH. Remova o comentário para enviar.');

      const rateLimitData = rateLimitSnapshot.data();
      const previousReset = rateLimitData ? toDate(rateLimitData.lastReset) : null;
      const currentCount = previousReset && previousReset > windowStart ? Number(rateLimitData?.count || 0) : 0;
      if (currentCount >= RATE_LIMIT_MAX) {
        throw new TeamEvaluationRejected('Muitas avaliações em pouco tempo. Aguarde e tente novamente.');
      }

      const answers = dto.answers.map((answer) => ({
        criterionId: answer.criterionId,
        criterionName: latestLeadershipCriteria.find((criterion) => criterion.id === answer.criterionId)?.data().name || answer.criterionId,
        score: answer.score,
      }));
      const overallScore = answers.reduce((sum, answer) => sum + answer.score, 0) / answers.length;
      transaction.create(evaluationRef, buildAnonymousLeadershipResponse({
        managerId: latestManager.id,
        periodId: latestPeriod.id,
        answers,
        overallScore: Math.round(overallScore * 100) / 100,
        comment: dto.comment ? dto.comment.trim().slice(0, DEFAULTS.MAX_COMMENT_LENGTH) : null,
        createdAt: now,
      }));
      // This document proves only that a pair completed the cycle. It contains
      // no evaluation id, score, comment, timestamp or reversible registration.
      transaction.create(participationRef, {
        periodId: latestPeriod.id,
        departmentId: department.id,
        participantHash: primaryParticipationHash(`person:${participant.id}`),
        completedDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now),
      });
      transaction.set(rateLimitRef, {
        count: currentCount + 1,
        lastReset: previousReset && previousReset > windowStart ? previousReset : now,
      });
    });

    return { success: true };
  } catch (error) {
    if (error instanceof TeamEvaluationRejected) {
      const duplicate = error.message === 'Você já avaliou esta liderança neste ciclo.';
      return { success: false, error: error.message, status: duplicate ? 409 : 400 };
    }
    logError('leadership_submission_failed', error);
    return { success: false, error: 'Erro interno. Tente novamente.' };
  }
}

// ── Self Evaluation Tokens ────────────────────────────────────

function generateToken(): string {
  return randomBytes(36).toString('hex'); // 72 char hex token
}

export async function generateSelfEvaluationToken(
  input: GenerateTokenInput,
  performedBy: string,
  performedByName?: string
): Promise<SelfEvaluationToken> {
  const manager = await getManagerById(input.managerId);
  if (!manager || manager.status !== 'ACTIVE') {
    throw new Error('O gerente selecionado não está disponível para autoavaliação.');
  }
  const period = await getPeriodById(input.periodId);
  if (!period || period.status !== 'OPEN') {
    throw new Error('Selecione um período de avaliação aberto.');
  }

  const token = generateToken();
  const tokenHash = hashSelfEvaluationToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.expiresInDays * 24 * 60 * 60 * 1000);

  const data = {
    tokenHash,
    managerId: input.managerId,
    periodId: input.periodId,
    status: 'PENDING',
    maxUses: input.maxUses,
    usedCount: 0,
    expiresAt,
    createdAt: now,
    updatedAt: now,
    createdBy: performedBy,
  };

  const docRef = await adminDb.collection(COLLECTIONS.SELF_EVALUATION_TOKENS).add(data);

  await createAuditLog({
    action: 'TOKEN_GENERATED',
    entityType: 'selfEvaluationTokens',
    entityId: docRef.id,
    description: `Token de autoavaliação gerado para gerente ${input.managerId}`,
    performedBy,
    performedByName,
    metadata: { managerId: input.managerId, periodId: input.periodId, expiresInDays: input.expiresInDays },
  });

  return {
    id: docRef.id,
    token,
    managerId: data.managerId,
    periodId: data.periodId,
    status: data.status,
    maxUses: data.maxUses,
    usedCount: data.usedCount,
    expiresAt: data.expiresAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdBy: data.createdBy,
  } as SelfEvaluationToken;
}

export async function getSelfEvaluationTokenByValue(
  tokenValue: string
): Promise<SelfEvaluationToken | null> {
  const hashedSnapshot = await adminDb
    .collection(COLLECTIONS.SELF_EVALUATION_TOKENS)
    .where('tokenHash', '==', hashSelfEvaluationToken(tokenValue))
    .limit(1)
    .get();

  if (!hashedSnapshot.empty) return mapDocToToken(hashedSnapshot.docs[0]);

  // Legacy support: older tokens were stored in plain text. New tokens are hash-only.
  const snapshot = await adminDb
    .collection(COLLECTIONS.SELF_EVALUATION_TOKENS)
    .where('token', '==', tokenValue)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return mapDocToToken(snapshot.docs[0]);
}

export async function getRecentSelfEvaluationTokens(limit = 100): Promise<SelfEvaluationToken[]> {
  const snapshot = await adminDb
    .collection(COLLECTIONS.SELF_EVALUATION_TOKENS)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map(mapDocToToken);
}

export async function getTokensForManager(managerId: string): Promise<SelfEvaluationToken[]> {
  const snapshot = await adminDb
    .collection(COLLECTIONS.SELF_EVALUATION_TOKENS)
    .where('managerId', '==', managerId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(mapDocToToken);
}

export async function invalidateToken(
  tokenId: string,
  performedBy: string,
  performedByName?: string
): Promise<void> {
  const tokenRef = adminDb.collection(COLLECTIONS.SELF_EVALUATION_TOKENS).doc(tokenId);
  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(tokenRef);
    if (!snapshot.exists) throw new Error('Link de autoavaliação não encontrado.');
    const token = mapDocToToken(snapshot);
    if (token.status !== 'PENDING' || token.usedCount >= token.maxUses || token.expiresAt <= new Date()) {
      throw new Error('Somente links pendentes e não expirados podem ser cancelados.');
    }
    transaction.update(tokenRef, { status: 'INVALIDATED', updatedAt: new Date() });
  });

  await createAuditLog({
    action: 'TOKEN_INVALIDATED',
    entityType: 'selfEvaluationTokens',
    entityId: tokenId,
    description: 'Token de autoavaliação invalidado',
    performedBy,
    performedByName,
  });
}

export async function submitSelfEvaluation(
  dto: SubmitSelfEvaluationDTO
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Find and validate token
    const tokenDoc = await getSelfEvaluationTokenByValue(dto.token);

    if (!tokenDoc) {
      return { success: false, error: 'Link de autoavaliação inválido' };
    }

    if (tokenDoc.status === 'EXPIRED') {
      return { success: false, error: 'Este link de autoavaliação expirou' };
    }

    if (tokenDoc.status === 'INVALIDATED') {
      return { success: false, error: 'Este link de autoavaliação foi invalidado' };
    }

    if (tokenDoc.status === 'USED' && tokenDoc.usedCount >= tokenDoc.maxUses) {
      return { success: false, error: 'Esta autoavaliação já foi respondida' };
    }

    if (new Date() > tokenDoc.expiresAt) {
      // Mark as expired
      await adminDb.collection(COLLECTIONS.SELF_EVALUATION_TOKENS).doc(tokenDoc.id).update({
        status: 'EXPIRED',
        updatedAt: new Date(),
      });
      return { success: false, error: 'Este link de autoavaliação expirou' };
    }

    // 2. Validate the manager and period before accepting a response.
    const manager = await getManagerById(tokenDoc.managerId);
    if (!manager || manager.status !== 'ACTIVE') {
      return { success: false, error: 'O gerente não está disponível para autoavaliação.' };
    }
    const period = await getPeriodById(tokenDoc.periodId);
    if (!period) return { success: false, error: 'Período não encontrado' };
    if (period.status !== 'OPEN') {
      return { success: false, error: 'O período de avaliação foi encerrado' };
    }

    // 3. Validate answers
    const activeCriteria = await getActiveCriteria();
    const activeCriteriaIds = activeCriteria.map((c) => c.id);
    const { valid, errors } = validateAnswers(dto.answers, activeCriteriaIds);

    if (!valid) {
      return { success: false, error: errors.join(', ') };
    }

    // 4. Calculate overall score
    const validScores = dto.answers
      .filter((a) => a.score >= 1 && a.score <= 5)
      .map((a) => a.score);
    const overallScore =
      validScores.length > 0
        ? validScores.reduce((sum, s) => sum + s, 0) / validScores.length
        : 0;

    // 5. Store the answer and consume the token in one transaction. This prevents
    // concurrent requests from using the same single-use link twice.
    const settings = await getSettings();
    const selfEvalData = {
      managerId: tokenDoc.managerId,
      periodId: tokenDoc.periodId,
      evaluationType: 'SELF' as EvaluationType,
      tokenId: tokenDoc.id,
      answers: dto.answers.map((a) => ({
        criterionId: a.criterionId,
        score: a.score,
      })) as EvaluationAnswer[],
      overallScore: Math.round(overallScore * 100) / 100,
      comment: settings.commentsEnabled && dto.comment ? dto.comment.trim().slice(0, DEFAULTS.MAX_COMMENT_LENGTH) : null,
      createdAt: new Date(),
    };
    const tokenRef = adminDb.collection(COLLECTIONS.SELF_EVALUATION_TOKENS).doc(tokenDoc.id);
    const periodRef = adminDb.collection(COLLECTIONS.EVALUATION_PERIODS).doc(tokenDoc.periodId);
    const managerRef = adminDb.collection(COLLECTIONS.MANAGERS).doc(tokenDoc.managerId);
    const evaluationRef = adminDb.collection(COLLECTIONS.SELF_EVALUATIONS).doc();

    try {
      await adminDb.runTransaction(async (transaction) => {
        const [freshTokenSnapshot, freshPeriodSnapshot, freshManagerSnapshot] = await Promise.all([
          transaction.get(tokenRef),
          transaction.get(periodRef),
          transaction.get(managerRef),
        ]);

        if (!freshTokenSnapshot.exists) throw new SelfEvaluationRejected('Link de autoavaliação inválido.');
        const freshToken = mapDocToToken(freshTokenSnapshot);
        if (freshToken.status === 'INVALIDATED') {
          throw new SelfEvaluationRejected('Este link de autoavaliação foi invalidado.');
        }
        if (freshToken.status === 'EXPIRED' || Date.now() > freshToken.expiresAt.getTime()) {
          throw new SelfEvaluationRejected('Este link de autoavaliação expirou.');
        }
        if (freshToken.usedCount >= freshToken.maxUses) {
          throw new SelfEvaluationRejected('Esta autoavaliação já foi respondida.');
        }
        if (!freshPeriodSnapshot.exists || freshPeriodSnapshot.data()?.status !== 'OPEN') {
          throw new SelfEvaluationRejected('O período de avaliação foi encerrado.');
        }
        if (!freshManagerSnapshot.exists || freshManagerSnapshot.data()?.status !== 'ACTIVE') {
          throw new SelfEvaluationRejected('O gerente não está disponível para autoavaliação.');
        }

        const now = new Date();
        const newUsedCount = freshToken.usedCount + 1;
        const tokenUpdate: Record<string, unknown> = {
          status: newUsedCount >= freshToken.maxUses ? 'USED' : 'PENDING',
          usedCount: newUsedCount,
          updatedAt: now,
        };
        if (newUsedCount >= freshToken.maxUses) tokenUpdate.usedAt = now;

        transaction.create(evaluationRef, { ...selfEvalData, createdAt: now });
        transaction.update(tokenRef, tokenUpdate);
      });
    } catch (error) {
      if (error instanceof SelfEvaluationRejected) {
        return { success: false, error: error.message };
      }
      throw error;
    }

    await createAuditLog({
      action: 'SELF_EVALUATION_SUBMITTED',
      entityType: 'selfEvaluations',
      description: `Autoavaliação enviada para gerente ${tokenDoc.managerId}`,
      performedBy: 'SYSTEM',
      metadata: { managerId: tokenDoc.managerId, periodId: tokenDoc.periodId },
    });

    return { success: true };
  } catch (error) {
    logError('legacy_self_submission_failed', error);
    return { success: false, error: 'Erro interno. Tente novamente.' };
  }
}

// ── Read Operations ───────────────────────────────────────────

export async function getEvaluationsByPeriod(periodId: string): Promise<Evaluation[]> {
  const [snapshot, period] = await Promise.all([
    adminDb.collection(COLLECTIONS.EVALUATIONS).where('periodId', '==', periodId).get(),
    adminDb.collection(COLLECTIONS.EVALUATION_PERIODS).doc(periodId).get(),
  ]);
  const required = period.data()?.leadershipParticipationRequired === true;
  return snapshot.docs.filter((doc) => !required || doc.data().participationVerified === true).map(mapDocToEvaluation);
}

export async function getEvaluationsByManager(managerId: string): Promise<Evaluation[]> {
  const [teamSnap, selfSnap] = await Promise.all([
    adminDb
      .collection(COLLECTIONS.EVALUATIONS)
      .where('managerId', '==', managerId)
      .get(),
    adminDb
      .collection(COLLECTIONS.SELF_EVALUATIONS)
      .where('managerId', '==', managerId)
      .get(),
  ]);

  return [
    ...teamSnap.docs.map(mapDocToEvaluation),
    ...selfSnap.docs.map(mapDocToEvaluation),
  ];
}

export async function getEvaluationsByManagerAndPeriod(
  managerId: string,
  periodId: string
): Promise<{ team: Evaluation[]; self: Evaluation[] }> {
  const [teamSnap, selfSnap] = await Promise.all([
    adminDb
      .collection(COLLECTIONS.EVALUATIONS)
      .where('managerId', '==', managerId)
      .where('periodId', '==', periodId)
      .get(),
    adminDb
      .collection(COLLECTIONS.SELF_EVALUATIONS)
      .where('managerId', '==', managerId)
      .where('periodId', '==', periodId)
      .get(),
  ]);

  return {
    team: teamSnap.docs.map(mapDocToEvaluation),
    self: selfSnap.docs.map(mapDocToEvaluation),
  };
}

export async function getAllEvaluationsForPeriod(periodId: string): Promise<{
  team: Evaluation[];
  self: Evaluation[];
}> {
  const [teamSnap, selfSnap] = await Promise.all([
    adminDb
      .collection(COLLECTIONS.EVALUATIONS)
      .where('periodId', '==', periodId)
      .get(),
    adminDb
      .collection(COLLECTIONS.SELF_EVALUATIONS)
      .where('periodId', '==', periodId)
      .get(),
  ]);

  return {
    team: teamSnap.docs.map(mapDocToEvaluation),
    self: selfSnap.docs.map(mapDocToEvaluation),
  };
}

export async function getCommentsByManagerAndPeriod(
  managerId: string,
  periodId: string
): Promise<string[]> {
  const snapshot = await adminDb
    .collection(COLLECTIONS.EVALUATIONS)
    .where('managerId', '==', managerId)
    .where('periodId', '==', periodId)
    .get();

  return snapshot.docs
    .map((doc) => doc.data().comment)
    .filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
}

export async function getTeamCommentsForManagerAndPeriod(
  managerId: string,
  periodId: string
): Promise<Array<{ id: string; comment: string; createdAt: string }>> {
  const [snapshot, period] = await Promise.all([
    adminDb.collection(COLLECTIONS.EVALUATIONS).where('managerId', '==', managerId).where('periodId', '==', periodId).get(),
    adminDb.collection(COLLECTIONS.EVALUATION_PERIODS).doc(periodId).get(),
  ]);
  const participationRequired = period.data()?.leadershipParticipationRequired === true;

  return snapshot.docs
    .filter((doc) => !participationRequired || doc.data().participationVerified === true)
    .map((doc) => ({
      id: doc.id,
      comment: doc.data().comment,
      createdAt: toDate(doc.data().createdAt) || new Date(),
    }))
    .filter((entry): entry is { id: string; comment: string; createdAt: Date } =>
      typeof entry.comment === 'string' && entry.comment.trim().length > 0
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((entry) => ({
      id: entry.id,
      comment: entry.comment,
      // Expose only the calendar date to reduce the chance of linking a comment
      // to a particular employee's shift or submission time.
      createdAt: new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(entry.createdAt),
    }));
}

export async function getEvaluationStats(periodId: string): Promise<{
  teamCount: number;
  selfCount: number;
  evaluatedManagerIds: string[];
}> {
  const { team, self } = await getAllEvaluationsForPeriod(periodId);
  const evaluatedManagerIds = [...new Set(team.map((e) => e.managerId))];

  return {
    teamCount: team.length,
    selfCount: self.length,
    evaluatedManagerIds,
  };
}
