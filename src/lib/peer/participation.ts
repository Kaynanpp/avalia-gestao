export type PeerIdentity = { id: string; departmentId: string; active: boolean };

export function validatePeerRelationship(evaluator: PeerIdentity, target: PeerIdentity): string | null {
  if (!evaluator.active) return 'Seu cadastro não está ativo.';
  if (!target.active) return 'A pessoa selecionada não está disponível.';
  if (evaluator.id === target.id) return 'Você não pode avaliar a si próprio.';
  if (evaluator.departmentId !== target.departmentId) return 'Você só pode avaliar colegas do seu setor.';
  return null;
}

export function buildAnonymousPeerResponse(input: {
  targetId: string;
  targetName: string;
  departmentId: string;
  departmentName: string;
  periodId: string;
  scores: Record<string, number>;
  criteriaSnapshot: Array<{ id: string; name: string; description: string }>;
  comment: string | null;
  createdAt: Date;
}) {
  return {
    coworkerId: input.targetId,
    coworkerName: input.targetName,
    departmentId: input.departmentId,
    departmentName: input.departmentName,
    periodId: input.periodId,
    scores: input.scores,
    criteriaSnapshot: input.criteriaSnapshot,
    comment: input.comment,
    createdAt: input.createdAt,
    source: 'PUBLIC_DIRECTORY' as const,
  };
}
