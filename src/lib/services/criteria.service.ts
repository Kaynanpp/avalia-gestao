/**
 * Criteria Service - Server-side
 */

import { cache } from 'react';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import type { Criterion, CreateCriterionInput, UpdateCriterionInput, EvaluationModality } from '@/types';
import { toDate } from '@/lib/utils';
import { createAuditLog } from './audit.service';
import { criterionMatchesModality } from '@/lib/criteria-modality';

function mapDocToCriterion(doc: FirebaseFirestore.DocumentSnapshot): Criterion {
  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    order: data.order,
    active: data.active ?? true,
    modality: ['LEADERSHIP', 'PEER', 'BOTH'].includes(data.modality) ? data.modality : 'LEADERSHIP',
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  };
}

async function readCriteria(activeOnly = false, modality?: Exclude<EvaluationModality, 'BOTH'>): Promise<Criterion[]> {
  let query: FirebaseFirestore.Query = adminDb.collection(COLLECTIONS.CRITERIA);

  if (activeOnly) {
    query = query.where('active', '==', true);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(mapDocToCriterion)
    .filter((criterion) => !modality || criterionMatchesModality(criterion.modality, modality))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR'));
}

export const getCriteria = cache(readCriteria);

export async function getActiveCriteria(modality: Exclude<EvaluationModality, 'BOTH'> = 'LEADERSHIP'): Promise<Criterion[]> {
  return getCriteria(true, modality);
}

export async function getCriterionById(id: string): Promise<Criterion | null> {
  const doc = await adminDb.collection(COLLECTIONS.CRITERIA).doc(id).get();
  if (!doc.exists) return null;
  return mapDocToCriterion(doc);
}

export async function createCriterion(
  input: CreateCriterionInput,
  performedBy: string,
  performedByName?: string
): Promise<Criterion> {
  const now = new Date();
  const data = {
    name: input.name,
    description: input.description,
    order: input.order,
    active: true,
    modality: input.modality || 'LEADERSHIP',
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await adminDb.collection(COLLECTIONS.CRITERIA).add(data);

  await createAuditLog({
    action: 'CRITERION_CREATED',
    entityType: 'criteria',
    entityId: docRef.id,
    description: `Critério "${input.name}" criado`,
    performedBy,
    performedByName,
  });

  return { id: docRef.id, ...data };
}

export async function updateCriterion(
  id: string,
  input: UpdateCriterionInput,
  performedBy: string,
  performedByName?: string
): Promise<Criterion> {
  const existing = await getCriterionById(id);
  if (!existing) throw new Error('Critério não encontrado');

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.order !== undefined) updateData.order = input.order;
  if (input.active !== undefined) updateData.active = input.active;
  if (input.modality !== undefined) updateData.modality = input.modality;

  await adminDb.collection(COLLECTIONS.CRITERIA).doc(id).update(updateData);

  const action = input.active === false ? 'CRITERION_DEACTIVATED' : 'CRITERION_UPDATED';

  await createAuditLog({
    action,
    entityType: 'criteria',
    entityId: id,
    description: `Critério "${existing.name}" atualizado`,
    performedBy,
    performedByName,
    metadata: { changes: input },
  });

  return { ...existing, ...updateData, id } as Criterion;
}

export async function reorderCriteria(
  orderedIds: string[],
  performedBy: string,
  performedByName?: string
): Promise<void> {
  const batch = adminDb.batch();
  const now = new Date();

  orderedIds.forEach((id, index) => {
    const ref = adminDb.collection(COLLECTIONS.CRITERIA).doc(id);
    batch.update(ref, { order: index + 1, updatedAt: now });
  });

  await batch.commit();

  await createAuditLog({
    action: 'CRITERION_UPDATED',
    entityType: 'criteria',
    description: 'Critérios reordenados',
    performedBy,
    performedByName,
  });
}

/** Deactivates a criterion while keeping names available to historical reports. */
export async function deleteCriterion(
  id: string,
  performedBy: string,
  performedByName?: string
): Promise<void> {
  await updateCriterion(id, { active: false }, performedBy, performedByName);
}

export async function updateCriteriaOrder(
  orderedIds: string[],
  performedBy: string,
  performedByName?: string
): Promise<void> {
  return reorderCriteria(orderedIds, performedBy, performedByName);
}
