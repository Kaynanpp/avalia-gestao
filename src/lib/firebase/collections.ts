// Firestore collection names - centralized to avoid typos
export const COLLECTIONS = {
  USERS: 'users',
  DEPARTMENTS: 'departments',
  MANAGERS: 'managers',
  EVALUATION_PERIODS: 'evaluationPeriods',
  CRITERIA: 'criteria',
  EVALUATIONS: 'evaluations',
  SELF_EVALUATIONS: 'selfEvaluations',
  SELF_EVALUATION_TOKENS: 'selfEvaluationTokens',
  AUDIT_LOGS: 'auditLogs',
  SETTINGS: 'settings',
  SUBMISSION_TOKENS: 'submissionTokens',
  PEER_PARTICIPATION: 'peerParticipation',
  LEADERSHIP_PARTICIPATION: 'leadershipParticipation',
  DEVELOPMENT_PLANS: 'developmentPlans',
  SECURITY_RATE_LIMITS: 'securityRateLimits',
} as const;

// Default settings document ID
export const SETTINGS_DOC_ID = 'app';

// Default values
export const DEFAULTS = {
  MIN_EVALUATIONS_FOR_DISPLAY: 5,
  MAX_COMMENT_LENGTH: 1000,
  TOKEN_EXPIRY_DAYS: 30,
  TOKEN_MAX_USES: 1,
  RATE_LIMIT_MAX: 10,
  RATE_LIMIT_WINDOW_MS: 60_000,
} as const;

// Score scale labels
export const SCORE_LABELS: Record<number, string> = {
  1: 'Muito ruim',
  2: 'Precisa melhorar',
  3: 'Adequado',
  4: 'Muito bom',
  5: 'Excelente',
};

// Default criteria
export const DEFAULT_CRITERIA = [
  {
    name: 'Liderança',
    description: 'Capacidade de guiar, motivar e inspirar a equipe rumo aos objetivos.',
    order: 1,
  },
  {
    name: 'Comunicação',
    description: 'Clareza, transparência e efetividade na transmissão de informações.',
    order: 2,
  },
  {
    name: 'Organização',
    description: 'Planejamento, gestão do tempo e estruturação das atividades.',
    order: 3,
  },
  {
    name: 'Respeito e tratamento da equipe',
    description: 'Relacionamento respeitoso, empático e justo com todos os membros.',
    order: 4,
  },
  {
    name: 'Suporte à produção',
    description: 'Disponibilidade e efetividade em apoiar a equipe nas demandas diárias.',
    order: 5,
  },
  {
    name: 'Tomada de decisão',
    description: 'Agilidade e assertividade nas decisões, mesmo sob pressão.',
    order: 6,
  },
  {
    name: 'Capacidade de resolver problemas',
    description: 'Identificação e resolução eficaz de problemas operacionais e humanos.',
    order: 7,
  },
  {
    name: 'Desenvolvimento da equipe',
    description: 'Investimento no crescimento, capacitação e evolução dos membros da equipe.',
    order: 8,
  },
];

// Default departments for seeding
export const DEFAULT_DEPARTMENTS = [
  { name: 'Produção', description: 'Setor de produção industrial' },
  { name: 'Expedição', description: 'Setor de expedição e logística' },
  { name: 'Manutenção', description: 'Setor de manutenção de equipamentos' },
  { name: 'Administrativo', description: 'Setor administrativo' },
];
