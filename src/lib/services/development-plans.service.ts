import type { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { toDate } from '@/lib/utils';
import { parsePeriodDate } from '@/lib/utils/periods';
import type { DevelopmentPlan } from '@/types';
import { createAuditLog } from './audit.service';
import { developmentPlanSchema, updateDevelopmentPlanSchema } from '@/lib/validators';

function mapPlan(doc: FirebaseFirestore.DocumentSnapshot): DevelopmentPlan {
  const data = doc.data()!;
  return {
    id: doc.id, title: data.title || data.area || 'Plano de desenvolvimento', scope: data.scope, subjectId: data.subjectId, subjectName: data.subjectName,
    area: data.area, action: data.action, notes: data.notes || '', periodId: data.periodId || undefined, owner: data.owner, status: data.status,
    dueDate: toDate(data.dueDate) || new Date(), createdAt: toDate(data.createdAt) || new Date(), updatedAt: toDate(data.updatedAt) || new Date(),
  };
}

async function subject(scope: 'LEADERSHIP' | 'DEPARTMENT', subjectId: string) {
  const collection = scope === 'LEADERSHIP' ? COLLECTIONS.MANAGERS : COLLECTIONS.DEPARTMENTS;
  const snapshot = await adminDb.collection(collection).doc(subjectId).get();
  if (!snapshot.exists) throw new Error(scope === 'LEADERSHIP' ? 'Liderança não encontrada.' : 'Setor não encontrado.');
  return String(snapshot.data()!.name);
}

export async function getDevelopmentPlans(): Promise<DevelopmentPlan[]> {
  const snapshot = await adminDb.collection(COLLECTIONS.DEVELOPMENT_PLANS).limit(1000).get();
  return snapshot.docs.map(mapPlan).sort((left, right) => left.status.localeCompare(right.status) || left.dueDate.getTime() - right.dueDate.getTime());
}

export async function createDevelopmentPlan(input: z.infer<typeof developmentPlanSchema>, actor: { id: string; name: string }) {
  const subjectName = await subject(input.scope, input.subjectId);
  const dueDate = parsePeriodDate(input.dueDate, true);
  if (!Number.isFinite(dueDate.getTime())) throw new Error('Informe uma data válida.');
  const now = new Date();
  const ref = await adminDb.collection(COLLECTIONS.DEVELOPMENT_PLANS).add({ ...input, subjectName, dueDate, createdAt: now, updatedAt: now });
  await createAuditLog({ action: 'DEVELOPMENT_PLAN_CREATED', entityType: COLLECTIONS.DEVELOPMENT_PLANS, entityId: ref.id, description: `Plano de desenvolvimento criado para ${subjectName}`, performedBy: actor.id, performedByName: actor.name });
  return mapPlan(await ref.get());
}

export async function updateDevelopmentPlan(id: string, input: z.infer<typeof updateDevelopmentPlanSchema>, actor: { id: string; name: string }) {
  const ref = adminDb.collection(COLLECTIONS.DEVELOPMENT_PLANS).doc(id);
  const current = await ref.get();
  if (!current.exists) throw new Error('Plano não encontrado.');
  const existing = current.data()!;
  const scope = input.scope || existing.scope;
  const subjectId = input.subjectId || existing.subjectId;
  const subjectName = input.scope || input.subjectId ? await subject(scope, subjectId) : existing.subjectName;
  const dueDate = input.dueDate ? parsePeriodDate(input.dueDate, true) : existing.dueDate;
  if (input.dueDate && !Number.isFinite(dueDate.getTime())) throw new Error('Informe uma data válida.');
  const update = { ...input, scope, subjectId, subjectName, dueDate, updatedAt: new Date() };
  await ref.update(update);
  await createAuditLog({ action: 'DEVELOPMENT_PLAN_UPDATED', entityType: COLLECTIONS.DEVELOPMENT_PLANS, entityId: id, description: `Plano de desenvolvimento atualizado para ${subjectName}`, performedBy: actor.id, performedByName: actor.name, metadata: { status: input.status } });
  return mapPlan(await ref.get());
}

export async function deleteDevelopmentPlan(id: string, actor: { id: string; name: string }) {
  const ref = adminDb.collection(COLLECTIONS.DEVELOPMENT_PLANS).doc(id);
  const current = await ref.get();
  if (!current.exists) throw new Error('Plano não encontrado.');
  await ref.delete();
  await createAuditLog({ action: 'DEVELOPMENT_PLAN_DELETED', entityType: COLLECTIONS.DEVELOPMENT_PLANS, entityId: id, description: `Plano de desenvolvimento de ${current.data()!.subjectName} excluído`, performedBy: actor.id, performedByName: actor.name });
}
