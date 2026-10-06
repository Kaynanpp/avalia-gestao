/**
 * AvaliaGestão - Cálculos de Médias e Estatísticas
 *
 * Funções centralizadas para todos os cálculos do sistema.
 * IMPORTANTE:
 * - Médias da equipe são calculadas SOMENTE sobre avaliações TEAM
 * - Médias de autoavaliação são calculadas SOMENTE sobre avaliações SELF
 * - Nunca misturar os dois tipos no mesmo cálculo
 */

import type {
  Evaluation,
  CriterionResult,
  ManagerResult,
  ScoreDistribution,
  PeriodHistoryPoint,
} from '@/types';

// ── Utilitários Básicos ───────────────────────────────────────

/**
 * Calcula a média de um array de números.
 * Retorna null se o array estiver vazio.
 */
export function calculateAverage(scores: number[]): number | null {
  if (scores.length === 0) return null;
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Math.round((sum / scores.length) * 100) / 100;
}

/**
 * Arredonda para 1 casa decimal
 */
export function roundToOne(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Arredonda para 2 casas decimais
 */
export function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

// ── Cálculos de Score ─────────────────────────────────────────

/**
 * Calcula a média geral de uma avaliação (média de todos os critérios)
 */
export function calculateEvaluationOverallScore(
  answers: { score: number }[]
): number | null {
  const scores = answers.filter((a) => a.score >= 1 && a.score <= 5).map((a) => a.score);
  return calculateAverage(scores);
}

/**
 * Calcula a distribuição de notas para um conjunto de avaliações
 */
export function calculateScoreDistribution(scores: number[]): ScoreDistribution {
  const dist: ScoreDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const score of scores) {
    if (score >= 1 && score <= 5) {
      dist[score as keyof ScoreDistribution]++;
    }
  }
  return dist;
}

// ── Cálculos por Critério ─────────────────────────────────────

/**
 * Calcula resultados por critério para um conjunto de avaliações
 * Separando equipe e autoavaliação
 */
export function calculateCriteriaResults(
  teamEvaluations: Evaluation[],
  selfEvaluations: Evaluation[],
  criteriaIds: string[],
  criteriaNames: Record<string, string>
): CriterionResult[] {
  return criteriaIds.map((criterionId) => {
    // Notas da equipe para este critério
    const teamScores = teamEvaluations
      .flatMap((e) => e.answers)
      .filter((a) => a.criterionId === criterionId)
      .map((a) => a.score)
      .filter((s) => s >= 1 && s <= 5);

    // Nota de autoavaliação para este critério
    const selfScores = selfEvaluations
      .flatMap((e) => e.answers)
      .filter((a) => a.criterionId === criterionId)
      .map((a) => a.score)
      .filter((s) => s >= 1 && s <= 5);

    const teamAverage = calculateAverage(teamScores);
    const selfAverage = calculateAverage(selfScores);

    let difference: number | null = null;
    if (teamAverage !== null && selfAverage !== null) {
      difference = roundToTwo(selfAverage - teamAverage);
    }

    return {
      criterionId,
      criterionName: criteriaNames[criterionId] || criterionId,
      teamAverage,
      selfAverage,
      difference,
      teamCount: teamScores.length,
      distribution: calculateScoreDistribution(teamScores),
    };
  });
}

// ── Cálculos do Gerente ───────────────────────────────────────

/**
 * Calcula a média geral da equipe para um gerente em um período
 * SOMENTE sobre avaliações do tipo TEAM
 */
export function calculateManagerTeamAverage(
  teamEvaluations: Evaluation[]
): number | null {
  if (teamEvaluations.length === 0) return null;

  const allScores = teamEvaluations
    .flatMap((e) => e.answers)
    .map((a) => a.score)
    .filter((s) => s >= 1 && s <= 5);

  return calculateAverage(allScores);
}

/**
 * Calcula a média geral de autoavaliação para um gerente em um período
 * SOMENTE sobre avaliações do tipo SELF
 */
export function calculateManagerSelfAverage(
  selfEvaluations: Evaluation[]
): number | null {
  if (selfEvaluations.length === 0) return null;

  const allScores = selfEvaluations
    .flatMap((e) => e.answers)
    .map((a) => a.score)
    .filter((s) => s >= 1 && s <= 5);

  return calculateAverage(allScores);
}

/**
 * Calcula a diferença entre autoavaliação e equipe
 * Valor positivo = gerente se avalia mais alto que a equipe
 * Valor negativo = gerente se avalia mais baixo que a equipe
 * Null se algum dos dois não existir
 */
export function calculateDifference(
  teamAverage: number | null,
  selfAverage: number | null
): number | null {
  if (teamAverage === null || selfAverage === null) return null;
  return roundToTwo(selfAverage - teamAverage);
}

// ── Proteção Estatística do Anonimato ─────────────────────────

/**
 * Verifica se há dados suficientes para exibição agregada
 * Implementa a regra de proteção estatística do anonimato
 *
 * @param evaluationCount - Número de avaliações da equipe
 * @param minRequired - Mínimo configurado (padrão: 5)
 */
export function hasEnoughDataForDisplay(
  evaluationCount: number,
  minRequired: number = 5
): boolean {
  return evaluationCount >= minRequired;
}

// ── Evolução Histórica ────────────────────────────────────────

/**
 * Calcula a evolução histórica de um gerente por período
 */
export function calculatePeriodHistory(
  evaluationsByPeriod: Record<
    string,
    { periodName: string; teamEvaluations: Evaluation[]; selfEvaluations: Evaluation[] }
  >,
  minEvaluations: number = 5
): PeriodHistoryPoint[] {
  return Object.entries(evaluationsByPeriod).map(
    ([periodId, { periodName, teamEvaluations, selfEvaluations }]) => {
      const teamCount = teamEvaluations.length;
      const teamAverage = hasEnoughDataForDisplay(teamCount, minEvaluations)
        ? calculateManagerTeamAverage(teamEvaluations)
        : null;
      const selfAverage = calculateManagerSelfAverage(selfEvaluations);

      return {
        periodId,
        periodName,
        teamAverage,
        selfAverage,
        evaluationCount: teamCount,
      };
    }
  );
}

// ── Dashboard Geral ───────────────────────────────────────────

/**
 * Calcula a média geral de todas as avaliações da equipe
 * (para o dashboard - não específico por gerente)
 */
export function calculateOverallTeamAverage(
  teamEvaluations: Evaluation[]
): number | null {
  if (teamEvaluations.length === 0) return null;

  const allScores = teamEvaluations
    .flatMap((e) => e.answers)
    .map((a) => a.score)
    .filter((s) => s >= 1 && s <= 5);

  return calculateAverage(allScores);
}

/**
 * Conta quantos gerentes foram avaliados (têm pelo menos 1 avaliação de equipe)
 */
export function countEvaluatedManagers(
  managerIds: string[],
  teamEvaluations: Evaluation[]
): number {
  const evaluatedManagerIds = new Set(teamEvaluations.map((e) => e.managerId));
  return managerIds.filter((id) => evaluatedManagerIds.has(id)).length;
}

// ── Validação ─────────────────────────────────────────────────

/**
 * Valida se uma nota é válida (1-5)
 */
export function isValidScore(score: unknown): score is number {
  return typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 5;
}

/**
 * Valida se todas as respostas de uma avaliação são válidas
 */
export function validateAnswers(
  answers: unknown[],
  requiredCriteriaIds: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(answers)) {
    return { valid: false, errors: ['Respostas devem ser um array'] };
  }

  if (answers.length === 0) {
    return { valid: false, errors: ['É necessário responder ao menos um critério'] };
  }

  const answeredCriteriaIds = new Set<string>();
  const required = new Set(requiredCriteriaIds);
  if (required.size === 0) return { valid: false, errors: ['Nenhum critério disponível para este formulário.'] };

  for (const answer of answers) {
    if (typeof answer !== 'object' || answer === null) {
      errors.push('Formato de resposta inválido');
      continue;
    }

    const ans = answer as Record<string, unknown>;

    if (typeof ans.criterionId !== 'string') {
      errors.push('ID do critério inválido');
      continue;
    }

    if (!isValidScore(ans.score)) {
      errors.push(`Nota inválida para o critério ${ans.criterionId}. Deve ser entre 1 e 5.`);
      continue;
    }

    if (!required.has(ans.criterionId)) errors.push('O formulário contém um critério indisponível. Atualize a página.');
    if (answeredCriteriaIds.has(ans.criterionId)) errors.push('Cada critério deve ser respondido uma única vez.');
    answeredCriteriaIds.add(ans.criterionId);
  }

  // Check all required criteria are answered
  for (const criterionId of requiredCriteriaIds) {
    if (!answeredCriteriaIds.has(criterionId)) {
      errors.push(`Critério ${criterionId} não foi respondido`);
    }
  }

  return { valid: errors.length === 0, errors };
}
