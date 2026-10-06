/**
 * Validators using Zod
 * All validation happens server-side as the source of truth
 */

import { z } from 'zod';
import { DEFAULTS } from '@/lib/firebase/collections';

const documentIdSchema = z.string().trim().min(1, 'ID é obrigatório').max(128, 'ID inválido').refine(value => !value.includes('/'), 'ID inválido');

// ── Scores ───────────────────────────────────────────────────

export const scoreSchema = z
  .number()
  .int()
  .min(1, 'Nota mínima é 1')
  .max(5, 'Nota máxima é 5');

export const answerSchema = z.object({
  criterionId: documentIdSchema,
  score: scoreSchema,
});

// ── Avaliação ─────────────────────────────────────────────────

export const submitEvaluationSchema = z.object({
  managerId: documentIdSchema,
  periodId: documentIdSchema,
  evaluationType: z.literal('TEAM'),
  answers: z
    .array(answerSchema)
    .min(1, 'Responda ao menos um critério')
    .max(20, 'Número de critérios excedido'),
  comment: z
    .string()
    .max(DEFAULTS.MAX_COMMENT_LENGTH, `Comentário deve ter no máximo ${DEFAULTS.MAX_COMMENT_LENGTH} caracteres`)
    .optional()
    .nullable(),
  participationToken: z.string().min(40, 'Identificação de participação inválida').max(1200, 'Identificação de participação inválida'),
}).strict();

export const leadershipAccessSchema = z.object({
  registration: z.string().trim().min(1, 'Informe sua matrícula.').max(40),
}).strict();

export const submitSelfEvaluationSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  answers: z
    .array(answerSchema)
    .min(1, 'Responda ao menos um critério')
    .max(20, 'Número de critérios excedido'),
  comment: z
    .string()
    .max(DEFAULTS.MAX_COMMENT_LENGTH, `Comentário deve ter no máximo ${DEFAULTS.MAX_COMMENT_LENGTH} caracteres`)
    .optional()
    .nullable(),
});

// ── Lideranças ───────────────────────────────────────────────

export const leadershipLevelSchema = z.enum(['MANAGER', 'COORDINATOR', 'SUPERVISOR', 'LEADER', 'OTHER']);

export const managerFiltersSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  departmentId: z.string().max(128).optional(),
  leadershipLevel: leadershipLevelSchema.optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const createManagerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nome deve ter ao menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  email: z.string().trim().toLowerCase().email('E-mail inválido').or(z.literal('')).optional(),
  departmentId: documentIdSchema,
  position: z
    .string()
    .trim()
    .min(2, 'Cargo deve ter ao menos 2 caracteres')
    .max(100, 'Cargo deve ter no máximo 100 caracteres')
    .trim(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  leadershipLevel: leadershipLevelSchema.default('MANAGER'),
});

export const updateManagerSchema = createManagerSchema.partial();

// ── Setores ───────────────────────────────────────────────────

export const createDepartmentSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter ao menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  description: z
    .string()
    .max(300, 'Descrição deve ter no máximo 300 caracteres')
    .optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial().extend({ active: z.boolean().optional() });

// ── Períodos ─────────────────────────────────────────────────

export const createPeriodSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter ao menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  description: z
    .string()
    .max(300, 'Descrição deve ter no máximo 300 caracteres')
    .optional(),
  startDate: z.string().datetime({ message: 'Data de início inválida' }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD)')),
  endDate: z.string().datetime({ message: 'Data de fim inválida' }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD)')),
  modalities: z.array(z.enum(['LEADERSHIP', 'PEER'])).min(1, 'Selecione ao menos uma modalidade').default(['LEADERSHIP', 'PEER']),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: 'Data de fim deve ser posterior à data de início', path: ['endDate'] }
);

export const updatePeriodSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(300).optional(),
  startDate: z.string().datetime({ message: 'Data de início inválida' }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD)')).optional(),
  endDate: z.string().datetime({ message: 'Data de fim inválida' }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD)')).optional(),
  modalities: z.array(z.enum(['LEADERSHIP', 'PEER'])).min(1, 'Selecione ao menos uma modalidade').optional(),
});

// ── Critérios ─────────────────────────────────────────────────

export const createCriterionSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter ao menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  description: z
    .string()
    .min(5, 'Descrição deve ter ao menos 5 caracteres')
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .trim(),
  order: z.number().int().min(1).max(50),
  modality: z.enum(['LEADERSHIP', 'PEER', 'BOTH']).default('LEADERSHIP'),
});

export const updateCriterionSchema = createCriterionSchema.partial().extend({
  active: z.boolean().optional(),
});

// ── Tokens de Autoavaliação ───────────────────────────────────

export const generateTokenSchema = z.object({
  managerId: z.string().min(1, 'Selecione um gerente'),
  periodId: z.string().min(1, 'Selecione um período'),
  expiresInDays: z.number().int().min(1).max(365).default(30),
  maxUses: z.number().int().min(1).max(10).default(1),
});

export const invalidateSelfEvaluationTokenSchema = z.object({
  invalidate: z.literal(true),
});

// ── Usuários Administrativos ──────────────────────────────────

export const createUserSchema = z.object({
  email: z.string().email('E-mail inválido').toLowerCase().trim(),
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(100).trim(),
  role: z.enum(['ADMIN', 'RH']),
});

export const updateAdminUserSchema = z.object({
  active: z.boolean(),
});

export const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z
    .string()
    .min(8, 'A nova senha deve ter pelo menos 8 caracteres')
    .regex(/[a-z]/, 'Inclua uma letra minúscula')
    .regex(/[A-Z]/, 'Inclua uma letra maiúscula')
    .regex(/[0-9]/, 'Inclua um número')
    .regex(/[^A-Za-z0-9]/, 'Inclua um símbolo'),
});

// ── Login ─────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória').max(1024),
});

// ── Configurações ─────────────────────────────────────────────

export const updateSettingsSchema = z.object({
  companyName: z.string().min(1).max(100).trim().optional(),
  appName: z.string().min(1).max(100).trim().optional(),
  minEvaluationsForDisplay: z.number().int().min(1).max(50).optional(),
  commentsEnabled: z.boolean().optional(),
  defaultPeriodId: z.string().optional().nullable(),
});

// ── Planos de desenvolvimento ────────────────────────────────

export const developmentPlanSchema = z.object({
  title: z.string().trim().min(3, 'Informe um título').max(160),
  scope: z.enum(['LEADERSHIP', 'DEPARTMENT']),
  subjectId: documentIdSchema,
  area: z.string().trim().min(2, 'Informe a área de desenvolvimento').max(120),
  action: z.string().trim().min(5, 'Descreva a ação de desenvolvimento').max(1000),
  notes: z.string().trim().max(2000).optional().default(''),
  periodId: documentIdSchema.optional(),
  owner: z.string().trim().min(2, 'Informe o responsável').max(120),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida'),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
}).strict();

export const updateDevelopmentPlanSchema = developmentPlanSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Informe pelo menos uma alteração',
);

// ── Filtros ───────────────────────────────────────────────────

export const reportFiltersSchema = z.object({
  periodId: z.string().optional(),
  managerId: z.string().optional(),
  departmentId: z.string().optional(),
  evaluationType: z.enum(['TEAM', 'SELF']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
