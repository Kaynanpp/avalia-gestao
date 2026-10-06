/**
 * Managers Service - Server-side
 */

import { cache } from 'react';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { LEADERSHIP_LEVEL_LABELS } from '@/types';
import type { Manager, ManagerStatus, LeadershipLevel, CreateManagerInput, UpdateManagerInput } from '@/types';
import { toDate } from '@/lib/utils';
import { createAuditLog } from './audit.service';

function mapDocToManager(doc: FirebaseFirestore.DocumentSnapshot): Manager {
  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name,
    email: data.email || undefined,
    departmentId: data.departmentId,
    departmentName: data.departmentName,
    position: data.position,
    leadershipLevel: data.leadershipLevel in LEADERSHIP_LEVEL_LABELS ? data.leadershipLevel : 'MANAGER',
    status: data.status as ManagerStatus,
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
    deactivatedAt: toDate(data.deactivatedAt) || undefined,
  };
}

async function readManagers(filters?: {
  status?: ManagerStatus;
  departmentId?: string;
  leadershipLevel?: LeadershipLevel;
  search?: string;
}): Promise<Manager[]> {
  // Filter the level after mapping so existing registrations without a level remain visible.
  // Sorting locally also avoids requiring new composite indexes for filter combinations.
  const snapshot = await adminDb.collection(COLLECTIONS.MANAGERS).get();
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const search = normalize(filters?.search?.trim() || '');
  return snapshot.docs.map(mapDocToManager)
    .filter(manager => !filters?.status || manager.status === filters.status)
    .filter(manager => !filters?.departmentId || manager.departmentId === filters.departmentId)
    .filter(manager => !filters?.leadershipLevel || manager.leadershipLevel === filters.leadershipLevel)
    .filter(manager => !search || normalize([manager.name, manager.position, manager.departmentName, manager.email].filter(Boolean).join(' ')).includes(search))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export const getManagers = cache(readManagers);

export async function getActiveManagers(): Promise<Manager[]> {
  return getManagers({ status: 'ACTIVE' });
}

export async function getManagerById(id: string): Promise<Manager | null> {
  const doc = await adminDb.collection(COLLECTIONS.MANAGERS).doc(id).get();
  if (!doc.exists) return null;
  return mapDocToManager(doc);
}

export async function createManager(
  input: CreateManagerInput,
  performedBy: string,
  performedByName?: string
): Promise<Manager> {
  // Get department name for denormalization
  const deptDoc = await adminDb.collection(COLLECTIONS.DEPARTMENTS).doc(input.departmentId).get();
  if (!deptDoc.exists || deptDoc.data()!.active === false) {
    throw new Error('Selecione um setor ativo');
  }
  const departmentName = deptDoc.data()!.name;

  const now = new Date();
  const data = {
    name: input.name,
    email: input.email || '',
    departmentId: input.departmentId,
    departmentName,
    position: input.position,
    leadershipLevel: input.leadershipLevel || 'MANAGER',
    status: input.status || 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await adminDb.collection(COLLECTIONS.MANAGERS).add(data);

  await createAuditLog({
    action: 'MANAGER_CREATED',
    entityType: 'managers',
    entityId: docRef.id,
    description: `Liderança "${input.name}" cadastrada`,
    performedBy,
    performedByName,
    metadata: { managerId: docRef.id, name: input.name },
  });

  return {
    id: docRef.id,
    ...data,
  };
}

export async function updateManager(
  id: string,
  input: UpdateManagerInput,
  performedBy: string,
  performedByName?: string
): Promise<Manager> {
  const existing = await getManagerById(id);
  if (!existing) throw new Error('Liderança não encontrada');

  let departmentName = existing.departmentName;
  if (input.departmentId && input.departmentId !== existing.departmentId) {
    const deptDoc = await adminDb.collection(COLLECTIONS.DEPARTMENTS).doc(input.departmentId).get();
    if (!deptDoc.exists || deptDoc.data()!.active === false) {
      throw new Error('Selecione um setor ativo');
    }
    departmentName = deptDoc.data()!.name;
  }

  const now = new Date();
  const updateData: Record<string, unknown> = {
    updatedAt: now,
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.departmentId !== undefined) {
    updateData.departmentId = input.departmentId;
    updateData.departmentName = departmentName;
  }
  if (input.position !== undefined) updateData.position = input.position;
  if (input.leadershipLevel !== undefined) updateData.leadershipLevel = input.leadershipLevel;
  if (input.status !== undefined) {
    updateData.status = input.status;
    if (input.status === 'INACTIVE') {
      updateData.deactivatedAt = now;
    } else {
      updateData.deactivatedAt = null;
    }
  }

  await adminDb.collection(COLLECTIONS.MANAGERS).doc(id).update(updateData);

  const action = input.status === 'INACTIVE'
    ? 'MANAGER_DEACTIVATED'
    : input.status === 'ACTIVE'
    ? 'MANAGER_ACTIVATED'
    : 'MANAGER_UPDATED';

  await createAuditLog({
    action,
    entityType: 'managers',
    entityId: id,
    description: `Liderança "${existing.name}" atualizada`,
    performedBy,
    performedByName,
    metadata: { changes: input },
  });

  return { ...existing, ...updateData, id } as Manager;
}

export async function deactivateManager(
  id: string,
  performedBy: string,
  performedByName?: string
): Promise<void> {
  const existing = await getManagerById(id);
  if (!existing) throw new Error('Liderança não encontrada');

  const now = new Date();
  await adminDb.collection(COLLECTIONS.MANAGERS).doc(id).update({
    status: 'INACTIVE',
    deactivatedAt: now,
    updatedAt: now,
  });

  await createAuditLog({
    action: 'MANAGER_DEACTIVATED',
    entityType: 'managers',
    entityId: id,
    description: `Liderança "${existing.name}" desativada`,
    performedBy,
    performedByName,
  });
}

export async function activateManager(
  id: string,
  performedBy: string,
  performedByName?: string
): Promise<void> {
  const existing = await getManagerById(id);
  if (!existing) throw new Error('Liderança não encontrada');

  await adminDb.collection(COLLECTIONS.MANAGERS).doc(id).update({
    status: 'ACTIVE',
    deactivatedAt: null,
    updatedAt: new Date(),
  });

  await createAuditLog({
    action: 'MANAGER_ACTIVATED',
    entityType: 'managers',
    entityId: id,
    description: `Liderança "${existing.name}" reativada`,
    performedBy,
    performedByName,
  });
}

export async function deleteManager(
  id: string,
  performedBy: string,
  performedByName?: string
): Promise<void> {
  const managerRef = adminDb.collection(COLLECTIONS.MANAGERS).doc(id);
  let deletedName = '';

  await adminDb.runTransaction(async (transaction) => {
    const managerSnapshot = await transaction.get(managerRef);
    if (!managerSnapshot.exists) throw new Error('Liderança não encontrada.');
    deletedName = managerSnapshot.data()!.name;

    const teamEvaluations = adminDb.collection(COLLECTIONS.EVALUATIONS).where('managerId', '==', id).limit(1);
    const selfEvaluations = adminDb.collection(COLLECTIONS.SELF_EVALUATIONS).where('managerId', '==', id).limit(1);
    const selfTokens = adminDb.collection(COLLECTIONS.SELF_EVALUATION_TOKENS).where('managerId', '==', id).limit(1);
    const [teamSnapshot, selfSnapshot, tokenSnapshot] = await Promise.all([
      transaction.get(teamEvaluations),
      transaction.get(selfEvaluations),
      transaction.get(selfTokens),
    ]);

    if (!teamSnapshot.empty || !selfSnapshot.empty || !tokenSnapshot.empty) {
      throw new Error('Esta liderança já possui avaliações ou links. Desative o cadastro para removê-lo das avaliações sem apagar o histórico.');
    }

    transaction.delete(managerRef);
  });

  await createAuditLog({
    action: 'MANAGER_DELETED',
    entityType: 'managers',
    entityId: id,
    description: `Cadastro da liderança "${deletedName}" excluído`,
    performedBy,
    performedByName,
  });
}
