import { logError } from '@/lib/observability/logger';
/**
 * Audit Log Service - Server-side
 * Records all important administrative operations
 */

import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import type { AuditLog, AuditAction } from '@/types';
import { toDate } from '@/lib/utils';

interface CreateAuditLogParams {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  description: string;
  performedBy: string;
  performedByName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates an audit log entry
 * Logs are immutable - no updates or deletes
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    const logData: Omit<AuditLog, 'id'> = {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      description: params.description,
      performedBy: params.performedBy,
      performedByName: params.performedByName,
      metadata: params.metadata,
      createdAt: new Date(),
    };

    // Remove undefined fields
    const cleanData = Object.fromEntries(
      Object.entries(logData).filter(([, v]) => v !== undefined)
    );

    await adminDb.collection(COLLECTIONS.AUDIT_LOGS).add(cleanData);
  } catch (error) {
    // Log errors should not fail the main operation
    logError('audit_write_failed', error);
  }
}

/**
 * Gets audit logs with optional filters
 */
export async function getAuditLogs(options?: {
  entityType?: string;
  entityId?: string;
  action?: AuditAction;
  limit?: number;
}): Promise<AuditLog[]> {
  let query = adminDb
    .collection(COLLECTIONS.AUDIT_LOGS)
    .orderBy('createdAt', 'desc');

  if (options?.limit) {
    query = query.limit(options.limit) as any;
  } else {
    query = query.limit(200) as any;
  }

  const snapshot = await query.get();

  let logs = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      action: data.action as AuditAction,
      entityType: data.entityType,
      entityId: data.entityId,
      description: data.description,
      performedBy: data.performedBy,
      performedByName: data.performedByName,
      metadata: data.metadata,
      createdAt: toDate(data.createdAt) || new Date(),
    } as AuditLog;
  });

  // Apply filters in memory (Firestore free tier limits compound queries)
  if (options?.entityType) {
    logs = logs.filter((l) => l.entityType === options.entityType);
  }
  if (options?.entityId) {
    logs = logs.filter((l) => l.entityId === options.entityId);
  }
  if (options?.action) {
    logs = logs.filter((l) => l.action === options.action);
  }

  return logs;
}
