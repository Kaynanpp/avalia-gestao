import { logError } from '@/lib/observability/logger';
/**
 * Authentication service - Server-side
 * Handles Firebase Admin Auth operations
 */

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import type { AdminUser, UserRole, ApiResponse } from '@/types';
import { cookies } from 'next/headers';
import { toDate } from '@/lib/utils';
import { createAuditLog } from '@/lib/services/audit.service';
import { randomBytes } from 'crypto';

const SESSION_COOKIE_NAME = 'avalia_session';
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

// ── Session Management ────────────────────────────────────────

/**
 * Creates a session cookie from a Firebase ID token
 */
export async function createSessionCookie(idToken: string): Promise<string> {
  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_MS,
  });
  return sessionCookie;
}

/**
 * Verifies a session cookie and returns the decoded token
 */
export async function verifySessionCookie(sessionCookie: string) {
  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedToken;
  } catch {
    return null;
  }
}

/**
 * Gets the current authenticated admin user from the session cookie
 */
export async function getCurrentUser(): Promise<AdminUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) return null;

    const decodedToken = await verifySessionCookie(sessionCookie);
    if (!decodedToken) return null;

    const userDoc = await adminDb
      .collection(COLLECTIONS.USERS)
      .doc(decodedToken.uid)
      .get();

    if (!userDoc.exists) return null;

    const data = userDoc.data()!;
    if (!data.active || data.deleting) return null;

    return {
      id: userDoc.id,
      email: data.email,
      name: data.name,
      role: data.role as UserRole,
      active: data.active,
      mustChangePassword: Boolean(data.mustChangePassword),
      createdAt: toDate(data.createdAt) || new Date(),
      updatedAt: toDate(data.updatedAt) || new Date(),
      lastLoginAt: toDate(data.lastLoginAt) || undefined,
    };
  } catch (error) {
    logError('session_verification_failed', error);
    return null;
  }
}

/**
 * Requires authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<AdminUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Não autenticado');
  }
  if (user.mustChangePassword) {
    throw new Error('Acesso negado: Troca de senha obrigatória');
  }
  return user;
}

/**
 * Requires admin role - throws if not ADMIN
 */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await requireAuth();
  if (user.role !== 'ADMIN') {
    throw new Error('Acesso negado: requer papel ADMIN');
  }
  return user;
}

/**
 * Requires RH or ADMIN role
 */
export async function requireRH(): Promise<AdminUser> {
  const user = await requireAuth();
  if (user.role !== 'RH' && user.role !== 'ADMIN') {
    throw new Error('Acesso negado: requer papel RH ou ADMIN');
  }
  return user;
}

// ── User Management ───────────────────────────────────────────

/**
 * Creates a new admin user in Firebase Auth and Firestore
 * Only callable by ADMIN users
 */
export async function createAdminUser(
  email: string,
  password: string,
  name: string,
  role: UserRole,
  performedBy: AdminUser
): Promise<ApiResponse<{ id: string }>> {
  let createdUid: string | undefined;
  try {
    // Create in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });
    createdUid = userRecord.uid;

    const now = new Date();
    await adminAuth.setCustomUserClaims(userRecord.uid, { role, name });

    // Create in Firestore
    await adminDb.collection(COLLECTIONS.USERS).doc(userRecord.uid).set({
      email,
      name,
      role,
      active: true,
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
    });

    await createAuditLog({
      action: 'USER_CREATED',
      entityType: 'users',
      entityId: userRecord.uid,
      description: `Usuário ${email} criado com papel ${role}`,
      performedBy: performedBy.id,
      performedByName: performedBy.name,
      metadata: { role },
    });

    return { success: true, data: { id: userRecord.uid } };
  } catch (error: unknown) {
    if (createdUid) {
      await adminAuth.deleteUser(createdUid).catch((rollbackError) => {
        logError('user_creation_rollback_failed', rollbackError);
      });
    }
    const err = error as { code?: string; message?: string };
    if (err.code === 'auth/email-already-exists') {
      return { success: false, error: 'Este email já está em uso' };
    }
    logError('user_creation_failed', error);
    return { success: false, error: 'Erro ao criar usuário' };
  }
}

export async function resetAdminUserPassword(
  targetUserId: string,
  performedBy: AdminUser
): Promise<string> {
  if (targetUserId === performedBy.id) {
    throw new Error('Use a opção Minha conta para alterar sua própria senha.');
  }

  const userRef = adminDb.collection(COLLECTIONS.USERS).doc(targetUserId);
  const userSnapshot = await userRef.get();
  if (!userSnapshot.exists) throw new Error('Usuário não encontrado.');
  const user = userSnapshot.data()!;
  const temporaryPassword = `${randomBytes(3).toString('base64url')}Aa1!`;

  // Mark the account first so existing sessions lose access while the password
  // reset is being applied. The user can still complete the forced reset flow.
  await userRef.update({ mustChangePassword: true, updatedAt: new Date() });
  await adminAuth.updateUser(targetUserId, { password: temporaryPassword });
  await adminAuth.revokeRefreshTokens(targetUserId);

  await createAuditLog({
    action: 'USER_PASSWORD_RESET',
    entityType: 'users',
    entityId: targetUserId,
    description: `Senha temporária redefinida para ${user.email || targetUserId}`,
    performedBy: performedBy.id,
    performedByName: performedBy.name,
    metadata: { email: user.email, role: user.role },
  });

  return temporaryPassword;
}

export async function updateAdminUserStatus(
  targetUserId: string,
  active: boolean,
  performedBy: AdminUser
): Promise<void> {
  if (targetUserId === performedBy.id) {
    throw new Error('Você não pode desativar sua própria conta.');
  }

  const userRef = adminDb.collection(COLLECTIONS.USERS).doc(targetUserId);
  const userSnapshot = await userRef.get();
  if (!userSnapshot.exists) throw new Error('Usuário não encontrado.');

  const current = userSnapshot.data()!;
  if (current.active === active) return;

  const authUser = await adminAuth.getUser(targetUserId);
  await adminAuth.updateUser(targetUserId, { disabled: !active });

  try {
    await adminDb.runTransaction(async (transaction) => {
      const latestSnapshot = await transaction.get(userRef);
      if (!latestSnapshot.exists) throw new Error('Usuário não encontrado.');
      const latest = latestSnapshot.data()!;

      if (!active && latest.role === 'ADMIN' && latest.active) {
        const activeAdmins = adminDb.collection(COLLECTIONS.USERS)
          .where('role', '==', 'ADMIN');
        const activeAdminSnapshot = await transaction.get(activeAdmins);
        const activeAdminCount = activeAdminSnapshot.docs.filter((document) => document.data().active).length;
        if (activeAdminCount <= 1) {
          throw new Error('Mantenha pelo menos um administrador ativo no sistema.');
        }
      }

      transaction.update(userRef, { active, updatedAt: new Date() });
    });
  } catch (error) {
    await adminAuth.updateUser(targetUserId, { disabled: authUser.disabled });
    throw error;
  }

  if (!active) {
    await adminAuth.revokeRefreshTokens(targetUserId).catch((error) => {
      logError('session_revocation_failed', error);
    });
  }

  await createAuditLog({
    action: 'USER_UPDATED',
    entityType: 'users',
    entityId: targetUserId,
    description: `Acesso de ${current.email} ${active ? 'reativado' : 'desativado'}`,
    performedBy: performedBy.id,
    performedByName: performedBy.name,
    metadata: { active },
  });
}

export async function deleteAdminUser(
  targetUserId: string,
  performedBy: AdminUser
): Promise<void> {
  if (targetUserId === performedBy.id) {
    throw new Error('Você não pode excluir sua própria conta.');
  }

  const userRef = adminDb.collection(COLLECTIONS.USERS).doc(targetUserId);
  let deletedUser: FirebaseFirestore.DocumentData | undefined;

  await adminDb.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists) throw new Error('Usuário não encontrado.');
    const user = userSnapshot.data()!;

    if (user.role === 'ADMIN' && user.active) {
      const adminsQuery = adminDb.collection(COLLECTIONS.USERS).where('role', '==', 'ADMIN');
      const adminsSnapshot = await transaction.get(adminsQuery);
      const activeAdminCount = adminsSnapshot.docs.filter((document) => document.data().active).length;
      if (activeAdminCount <= 1) {
        throw new Error('Mantenha pelo menos um administrador ativo no sistema.');
      }
    }

    deletedUser = user;
    transaction.update(userRef, {
      active: false,
      deleting: true,
      updatedAt: new Date(),
    });
  });

  const user = deletedUser!;
  try {
    await adminAuth.updateUser(targetUserId, { disabled: true });
    await adminAuth.revokeRefreshTokens(targetUserId);
  } catch (error) {
    const authError = error as { code?: string };
    if (authError.code !== 'auth/user-not-found') throw error;
  }

  await createAuditLog({
    action: 'USER_DELETED',
    entityType: 'users',
    entityId: targetUserId,
    description: `A conta de ${user.email || targetUserId} foi excluída permanentemente`,
    performedBy: performedBy.id,
    performedByName: performedBy.name,
    metadata: { email: user.email, name: user.name, role: user.role },
  });

  try {
    await adminAuth.deleteUser(targetUserId);
  } catch (error) {
    const authError = error as { code?: string };
    if (authError.code !== 'auth/user-not-found') throw error;
  }

  await userRef.delete();
}

/**
 * Gets all admin users
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
  const snapshot = await adminDb
    .collection(COLLECTIONS.USERS)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      email: data.email,
      name: data.name,
      role: data.role as UserRole,
      active: data.active,
      mustChangePassword: Boolean(data.mustChangePassword),
      createdAt: toDate(data.createdAt) || new Date(),
      updatedAt: toDate(data.updatedAt) || new Date(),
      lastLoginAt: toDate(data.lastLoginAt) || undefined,
    };
  });
}

/**
 * Updates a user's last login time
 */
export async function updateLastLogin(userId: string): Promise<void> {
  await adminDb.collection(COLLECTIONS.USERS).doc(userId).update({
    lastLoginAt: new Date(),
    updatedAt: new Date(),
  });
}

// ── Cookie utilities ──────────────────────────────────────────

export { SESSION_COOKIE_NAME };
