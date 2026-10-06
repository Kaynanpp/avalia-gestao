import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { getCurrentUser, SESSION_COOKIE_NAME } from '@/lib/services/auth.service';
import { createAuditLog } from '@/lib/services/audit.service';
import { changeOwnPasswordSchema } from '@/lib/validators';
import { authenticateWithFirebase, InvalidCredentialsError } from '@/lib/security/password-auth';
import { readPeerJson, PeerError } from '@/lib/peer/http';
import { logError, requestIdFrom } from '@/lib/observability/logger';
import { consumeRateLimit, credentialActionRateLimitPolicy, rateLimitHeaders, RateLimitExceededError } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // This endpoint is the one allowed during the forced first-login password change.
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    await consumeRateLimit('own-password-change:actor', currentUser.id, credentialActionRateLimitPolicy());
    const input = changeOwnPasswordSchema.parse(await readPeerJson(request, 4096));
    const idToken = await authenticateWithFirebase(currentUser.email, input.currentPassword);
    const decoded = await adminAuth.verifyIdToken(idToken, true);

    if (decoded.uid !== currentUser.id) {
      return NextResponse.json({ success: false, error: 'Sessão inválida.' }, { status: 403 });
    }

    if (Date.now() - decoded.auth_time * 1000 > 5 * 60 * 1000) {
      return NextResponse.json(
        { success: false, error: 'Confirme sua senha atual novamente e tente outra vez.' },
        { status: 401 }
      );
    }

    await adminAuth.updateUser(currentUser.id, { password: input.newPassword });
    await adminDb.collection(COLLECTIONS.USERS).doc(currentUser.id).update({
      mustChangePassword: false,
      updatedAt: new Date(),
    });
    await adminAuth.revokeRefreshTokens(currentUser.id);
    await createAuditLog({
      action: 'USER_UPDATED',
      entityType: 'users',
      entityId: currentUser.id,
      description: 'Senha atualizada pelo próprio usuário',
      performedBy: currentUser.id,
      performedByName: currentUser.name,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      maxAge: 0,
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:' || (process.env.TRUST_PROXY === 'true' && request.headers.get('x-forwarded-proto')?.split(',')[0].trim() === 'https'),
      path: '/',
      sameSite: 'lax',
    });
    return response;
  } catch (error) {
    if (error instanceof PeerError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    if (error instanceof InvalidCredentialsError) {
      return NextResponse.json({ success: false, error: 'A senha atual está incorreta.' }, { status: 401 });
    }
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 429, headers: rateLimitHeaders(error) });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors.map((entry) => entry.message).join(', ') },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('Não autenticado') ? 401 : 500;
    if (status === 500) logError('password_change_failed', error, { requestId: requestIdFrom(request.headers) });
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Não foi possível atualizar a senha.' : message },
      { status }
    );
  }
}
