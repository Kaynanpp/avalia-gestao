// ============================================================
// TIPOS CENTRAIS DO SISTEMA AvaliaGestão
// ============================================================

// ── Enumerações ──────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'RH';

export type EvaluationType = 'TEAM' | 'SELF';

export type PeriodStatus = 'DRAFT' | 'OPEN' | 'CLOSED';

export type ManagerStatus = 'ACTIVE' | 'INACTIVE';

export type LeadershipLevel = 'MANAGER' | 'COORDINATOR' | 'SUPERVISOR' | 'LEADER' | 'OTHER';
export type EvaluationModality = 'LEADERSHIP' | 'PEER' | 'BOTH';
export type DevelopmentPlanStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type DevelopmentPlanScope = 'LEADERSHIP' | 'DEPARTMENT';

export const LEADERSHIP_LEVEL_LABELS: Record<LeadershipLevel, string> = {
  MANAGER: 'Gerência',
  COORDINATOR: 'Coordenação',
  SUPERVISOR: 'Supervisão',
  LEADER: 'Liderança de equipe',
  OTHER: 'Outra liderança',
};

export type TokenStatus = 'PENDING' | 'USED' | 'EXPIRED' | 'INVALIDATED';

// ── Usuários Administrativos ─────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  mustChangePassword?: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

// ── Setores ──────────────────────────────────────────────────

export interface Department {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Lideranças (IDs e coleção de gerentes preservados) ────────

export interface Manager {
  id: string;
  name: string;
  email?: string;
  departmentId: string;
  departmentName?: string; // denormalized for display
  position: string; // cargo
  leadershipLevel?: LeadershipLevel; // legacy records default to MANAGER
  status: ManagerStatus;
  createdAt: Date;
  updatedAt: Date;
  deactivatedAt?: Date;
}

// ── Critérios de Avaliação ───────────────────────────────────

export interface Criterion {
  id: string;
  name: string;
  description: string;
  order: number;
  active: boolean;
  modality: EvaluationModality;
  createdAt: Date;
  updatedAt: Date;
}

// ── Períodos de Avaliação ────────────────────────────────────

export interface EvaluationPeriod {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: PeriodStatus;
  createdAt: Date;
  updatedAt: Date;
  openedAt?: Date;
  closedAt?: Date;
  openedBy?: string;
  closedBy?: string;
  modalities?: EvaluationModality[];
  leadershipParticipationRequired?: boolean;
  participationEnforcedAt?: Date;
  metrics?: {
    leadershipEvaluations: number;
    leadershipParticipants: number;
    peerEvaluations: number;
    peerParticipants: number;
  };
}

// ── Respostas de Avaliação ───────────────────────────────────

export interface EvaluationAnswer {
  criterionId: string;
  criterionName?: string; // denormalized
  score: number; // 1-5
}

// ── Avaliações ───────────────────────────────────────────────

export interface Evaluation {
  id: string;
  managerId: string;
  periodId: string;
  evaluationType: EvaluationType;
  answers: EvaluationAnswer[];
  overallScore: number; // calculated average
  comment?: string;
  createdAt: Date;
  participationVerified?: boolean;
  // ANONYMITY: No user-identifying fields stored
  // evaluatorId, email, name, cpf, matricula, ip are NEVER stored
}

// ── Tokens de Autoavaliação ──────────────────────────────────

export interface SelfEvaluationToken {
  id: string;
  token: string; // returned only once when a link is generated; never exposed in token lists
  managerId: string;
  periodId: string;
  status: TokenStatus;
  maxUses: number; // typically 1
  usedCount: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // admin user id
  usedAt?: Date;
}

// ── Logs de Auditoria ────────────────────────────────────────

export interface AuditLog {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  description: string;
  performedBy: string; // admin user id
  performedByName?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export type AuditAction =
  | 'MANAGER_CREATED'
  | 'MANAGER_UPDATED'
  | 'MANAGER_ACTIVATED'
  | 'MANAGER_DEACTIVATED'
  | 'MANAGER_DELETED'
  | 'PERIOD_CREATED'
  | 'PERIOD_OPENED'
  | 'PERIOD_CLOSED'
  | 'PERIOD_UPDATED'
  | 'CRITERION_CREATED'
  | 'CRITERION_UPDATED'
  | 'CRITERION_DEACTIVATED'
  | 'DEPARTMENT_CREATED'
  | 'DEPARTMENT_UPDATED'
  | 'TOKEN_GENERATED'
  | 'TOKEN_INVALIDATED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_PASSWORD_RESET'
  | 'USER_DELETED'
  | 'SETTINGS_UPDATED'
  | 'EVALUATION_SUBMITTED'
  | 'SELF_EVALUATION_SUBMITTED'
  | 'DEVELOPMENT_PLAN_CREATED'
  | 'DEVELOPMENT_PLAN_UPDATED'
  | 'DEVELOPMENT_PLAN_DELETED'
  | 'REPORT_EXPORTED';

// ── Configurações ─────────────────────────────────────────────

export interface AppSettings {
  companyName: string;
  appName: string;
  minEvaluationsForDisplay: number; // statistical anonymity threshold
  commentsEnabled: boolean;
  defaultPeriodId?: string;
  updatedAt: Date;
  updatedBy?: string;
}

export interface DevelopmentPlan {
  id: string;
  title: string;
  scope: DevelopmentPlanScope;
  subjectId: string;
  subjectName: string;
  area: string;
  action: string;
  notes?: string;
  periodId?: string;
  owner: string;
  dueDate: Date;
  status: DevelopmentPlanStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ── DTOs de Formulário ────────────────────────────────────────

export interface SubmitEvaluationDTO {
  managerId: string;
  periodId: string;
  evaluationType: EvaluationType;
  answers: EvaluationAnswer[];
  comment?: string | null;
  participationToken: string; // signed, short-lived server token; never stored with the response
}

export interface SubmitSelfEvaluationDTO {
  token: string; // self-evaluation access token
  answers: EvaluationAnswer[];
  comment?: string | null;
}

// ── DTOs de Relatório ─────────────────────────────────────────

export interface CriterionResult {
  criterionId: string;
  criterionName: string;
  teamAverage: number | null;
  selfAverage: number | null;
  difference: number | null;
  teamCount: number;
  distribution: ScoreDistribution;
}

export interface ScoreDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface ManagerResult {
  managerId: string;
  managerName: string;
  departmentName: string;
  position: string;
  status: ManagerStatus;
  teamEvaluationCount: number;
  selfEvaluationCount: number;
  teamOverallAverage: number | null;
  selfOverallAverage: number | null;
  difference: number | null;
  criteriaResults: CriterionResult[];
  hasEnoughData: boolean; // based on minEvaluationsForDisplay
  periodHistory?: PeriodHistoryPoint[];
}

export interface PeriodHistoryPoint {
  periodId: string;
  periodName: string;
  teamAverage: number | null;
  selfAverage: number | null;
  evaluationCount: number;
}

export interface DashboardStats {
  totalManagers: number;
  activeManagers: number;
  evaluatedManagers: number;
  totalTeamEvaluations: number;
  totalSelfEvaluations: number;
  teamOverallAverage: number | null;
  currentPeriod?: EvaluationPeriod;
  currentPeriodTeamEvaluations: number;
  currentPeriodSelfEvaluations: number;
  totalCoworkers: number;
  totalDepartments: number;
  peerEvaluations: number;
  peerParticipants: number;
  leadershipParticipants: number;
  leadershipParticipationPercent: number | null;
  participationPercent: number | null;
  previousPeriodAverage: number | null;
  averageVariation: number | null;
  strongestCriterion?: { name: string; average: number };
  attentionCriterion?: { name: string; average: number };
  insights: string[];
}

// ── Filtros ───────────────────────────────────────────────────

export interface ReportFilters {
  periodId?: string;
  managerId?: string;
  departmentId?: string;
  evaluationType?: EvaluationType;
  status?: ManagerStatus;
}

// ── Exportação ────────────────────────────────────────────────

export type ExportFormat = 'CSV' | 'EXCEL' | 'PDF';

export interface ExportOptions {
  format: ExportFormat;
  filters: ReportFilters;
  includeComments: boolean;
  includeCharts: boolean;
}

// ── Paginação ─────────────────────────────────────────────────

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── API Responses ─────────────────────────────────────────────

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ── Formulários de Criação/Edição ─────────────────────────────

export interface CreateManagerInput {
  name: string;
  email?: string;
  departmentId: string;
  position: string;
  leadershipLevel?: LeadershipLevel;
  status: ManagerStatus;
}

export type UpdateManagerInput = Partial<CreateManagerInput>;

export interface CreateDepartmentInput {
  name: string;
  description?: string;
}

export type UpdateDepartmentInput = Partial<CreateDepartmentInput> & { active?: boolean };

export interface CreatePeriodInput {
  name: string;
  description?: string;
  startDate: string; // ISO string from form
  endDate: string;
  modalities?: EvaluationModality[];
}

export interface CreateCriterionInput {
  name: string;
  description: string;
  order: number;
  modality: EvaluationModality;
}

export type UpdateCriterionInput = Partial<CreateCriterionInput> & { active?: boolean };

export interface CreateUserInput {
  email: string;
  name: string;
  role: UserRole;
}

export interface GenerateTokenInput {
  managerId: string;
  periodId: string;
  expiresInDays: number;
  maxUses: number;
}
