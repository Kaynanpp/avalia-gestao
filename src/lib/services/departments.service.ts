/**
 * Departments Service - Server-side
 */

import { cache } from 'react';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import type { Department, CreateDepartmentInput, UpdateDepartmentInput } from '@/types';
import { toDate } from '@/lib/utils';
import { createAuditLog } from './audit.service';

function mapDocToDepartment(doc: FirebaseFirestore.DocumentSnapshot): Department {
  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name,
    description: data.description || undefined,
    active: data.active ?? true,
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  };
}

async function readDepartments(activeOnly = false): Promise<Department[]> {
  let query: FirebaseFirestore.Query = adminDb.collection(COLLECTIONS.DEPARTMENTS);

  if (activeOnly) {
    query = query.where('active', '==', true);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(mapDocToDepartment).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export const getDepartments = cache(readDepartments);

export async function getDepartmentById(id: string): Promise<Department | null> {
  const doc = await adminDb.collection(COLLECTIONS.DEPARTMENTS).doc(id).get();
  if (!doc.exists) return null;
  return mapDocToDepartment(doc);
}

export async function createDepartment(
  input: CreateDepartmentInput,
  performedBy: string,
  performedByName?: string
): Promise<Department> {
  const now = new Date();
  const data = {
    name: input.name,
    description: input.description || null,
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await adminDb.collection(COLLECTIONS.DEPARTMENTS).add(data);

  await createAuditLog({
    action: 'DEPARTMENT_CREATED',
    entityType: 'departments',
    entityId: docRef.id,
    description: `Setor "${input.name}" criado`,
    performedBy,
    performedByName,
  });

  return { id: docRef.id, ...data, description: data.description || undefined };
}

export async function updateDepartment(
  id: string,
  input: UpdateDepartmentInput,
  performedBy: string,
  performedByName?: string
): Promise<Department> {
  const existing = await getDepartmentById(id);
  if (!existing) throw new Error('Setor não encontrado');

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.active !== undefined) updateData.active = input.active;

  await adminDb.collection(COLLECTIONS.DEPARTMENTS).doc(id).update(updateData);

  await createAuditLog({
    action: 'DEPARTMENT_UPDATED',
    entityType: 'departments',
    entityId: id,
    description: `Setor "${existing.name}" atualizado`,
    performedBy,
    performedByName,
    metadata: { changes: input },
  });

  return { ...existing, ...updateData, id } as Department;
}

export async function toggleDepartmentStatus(
  id: string,
  active: boolean,
  performedBy: string,
  performedByName?: string
): Promise<void> {
  const existing = await getDepartmentById(id);
  if (!existing) throw new Error('Setor não encontrado');

  await adminDb.collection(COLLECTIONS.DEPARTMENTS).doc(id).update({
    active,
    updatedAt: new Date(),
  });

  await createAuditLog({
    action: 'DEPARTMENT_UPDATED',
    entityType: 'departments',
    entityId: id,
    description: `Setor "${existing.name}" ${active ? 'ativado' : 'desativado'}`,
    performedBy,
    performedByName,
  });
}

/** Archives a department without breaking historical manager records. */
export async function deleteDepartment(
  id: string,
  performedBy: string,
  performedByName?: string
): Promise<void> {
  await toggleDepartmentStatus(id, false, performedBy, performedByName);
}
