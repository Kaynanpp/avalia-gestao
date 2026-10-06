export type LeadershipIdentity = { id: string; departmentId: string; active: boolean };

export const leadershipPairKey = (periodId: string, participantId: string, managerId: string) =>
  `leadership-pair:${periodId}:${participantId}:${managerId}`;

export function validateLeadershipRelationship(participant: LeadershipIdentity, leadership: LeadershipIdentity): string | null {
  if (!participant.active) return 'Seu cadastro não está ativo.';
  if (!leadership.active) return 'A liderança selecionada não está disponível.';
  if (participant.departmentId !== leadership.departmentId) return 'Você só pode avaliar lideranças do seu setor.';
  return null;
}

export function buildAnonymousLeadershipResponse(input: {
  managerId: string;
  periodId: string;
  answers: Array<{ criterionId: string; criterionName: string; score: number }>;
  overallScore: number;
  comment: string | null;
  createdAt: Date;
}) {
  return {
    managerId: input.managerId,
    periodId: input.periodId,
    evaluationType: 'TEAM' as const,
    answers: input.answers,
    overallScore: input.overallScore,
    comment: input.comment,
    createdAt: input.createdAt,
    participationVerified: true,
    // Deliberately no participant id, hash, registration, token or participation document id.
  };
}

export function validUniqueEvaluationCount<T extends { participationVerified?: boolean }>(evaluations: T[], participationRequired: boolean) {
  return participationRequired ? evaluations.filter((evaluation) => evaluation.participationVerified === true).length : evaluations.length;
}
