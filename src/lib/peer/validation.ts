import { z } from 'zod';

export const peerIdSchema = z.string().min(1).max(150).regex(/^[a-zA-Z0-9_-]+$/, 'Identificador inválido.');
export const coworkerSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo.').max(120),
  registration: z.string().trim().max(40, 'A matrícula deve ter no máximo 40 caracteres.').default(''),
  position: z.string().trim().max(120, 'O cargo deve ter no máximo 120 caracteres.').default(''),
  departmentId: peerIdSchema,
  active: z.boolean().default(true),
}).strict();
export const peerTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32}$/, 'Link indisponível.');
export const peerLinkSchema = z.object({
  coworkerId: peerIdSchema, periodId: peerIdSchema,
  count: z.number().int().min(1).max(50).default(1),
  expiresInDays: z.number().int().min(1).max(30).default(7),
}).strict();
export const peerSubmissionSchema = z.object({
  token: peerTokenSchema,
  scores: z.record(peerIdSchema, z.number().int().min(1).max(5)).superRefine((scores, context) => {
    const count = Object.keys(scores).length;
    if (count < 1 || count > 20) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Responda todos os critérios disponíveis.' });
  }),
  comment: z.string().trim().max(1000, 'O comentário deve ter no máximo 1.000 caracteres.').optional().default(''),
  colleagueConfirmed: z.literal(true, { errorMap: () => ({ message: 'Confirme que está avaliando um colega do seu setor.' }) }),
}).strict();
export const openPeerSubmissionSchema = z.object({
  coworkerId: peerIdSchema,
  periodId: peerIdSchema,
  participationToken: z.string().min(40).max(1200, 'Código de participação inválido.'),
  scores: z.record(peerIdSchema, z.number().int().min(1).max(5)).superRefine((scores, context) => {
    const count = Object.keys(scores).length;
    if (count < 1 || count > 20) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Responda todos os critérios disponíveis.' });
  }),
  comment: z.string().trim().max(1000, 'O comentário deve ter no máximo 1.000 caracteres.').optional().default(''),
  colleagueConfirmed: z.literal(true, { errorMap: () => ({ message: 'Confirme que está avaliando um colega do seu setor e não a si próprio.' }) }),
}).strict();
export const peerAccessSchema = z.object({
  registration: z.string().trim().min(1, 'Informe sua matrícula.').max(40),
}).strict();
export const peerImportSchema = z.object({ text: z.string().max(150000), preview: z.boolean().default(true) }).strict();
