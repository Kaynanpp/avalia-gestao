import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { createSessionCookie, SESSION_COOKIE_NAME } from '@/lib/services/auth.service';
import { loginSchema } from '@/lib/validators';
import { PeerError, readPeerJson } from '@/lib/peer/http';
import { ZodError } from 'zod';
import { logError, logInfo, logWarning, requestIdFrom } from '@/lib/observability/logger';
import { authenticateWithFirebase, InvalidCredentialsError } from '@/lib/security/password-auth';
import {
  clearRateLimit,
  enforceRequestRateLimit,
  loginRateLimitPolicy,
  rateLimitHeaders,
  RateLimitExceededError,
} from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  const requestId = requestIdFrom(req.headers);
  try {
    const { email, password } = loginSchema.parse(await readPeerJson(req, 4096));
    const normalizedEmail = email.trim().toLowerCase();
    await enforceRequestRateLimit(req, 'admin-login', normalizedEmail, loginRateLimitPolicy());
    const idToken = await authenticateWithFirebase(normalizedEmail, password);

    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const userRef = adminDb.collection(COLLECTIONS.USERS).doc(decoded.uid);
    const userSnapshot = await userRef.get();
    const provisionedUser = userSnapshot.data();
    if (!userSnapshot.exists || !provisionedUser?.active || provisionedUser.deleting || !['RH', 'ADMIN'].includes(provisionedUser.role)) {
      return NextResponse.json(
        { success: false, error: 'Esta conta não tem acesso ativo ao painel.' },
        { status: 403 }
      );
    }

    const user = userSnapshot.data()!;
    await userRef.update({ lastLoginAt: new Date(), updatedAt: new Date() });

    // Create a short-lived server session only for an active, provisioned user.
    const sessionCookie = await createSessionCookie(idToken);

    // Set cookie
    const response = NextResponse.json({
      success: true,
      mustChangePassword: Boolean(user.mustChangePassword),
    }, { status: 200 });
    
    // Configura o cookie HTTP-only
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      maxAge: 5 * 24 * 60 * 60, // 5 days
      httpOnly: true,
      secure:
        req.nextUrl.protocol === 'https:' ||
        (process.env.TRUST_PROXY === 'true' && req.headers.get('x-forwarded-proto')?.split(',')[0].trim() === 'https'),
      path: '/',
      sameSite: 'lax',
    });

    await clearRateLimit('admin-login:subject', normalizedEmail).catch((error) => {
      logError('login_counter_reset_failed', error, { requestId });
    });

    logInfo('admin_login_succeeded', { requestId });

    return response;
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      logWarning('admin_login_rate_limited', { requestId });
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 429, headers: rateLimitHeaders(error) },
      );
    }
    const invalidCredentials = error instanceof InvalidCredentialsError;
    if (invalidCredentials) logWarning('admin_login_rejected', { requestId });
    else if (!(error instanceof ZodError) && !(error instanceof PeerError)) {
      logError('admin_login_failed', error, { requestId });
    }
    if (error instanceof PeerError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json(
      { success: false, error: invalidCredentials || error instanceof ZodError ? 'Credenciais inválidas' : 'Serviço temporariamente indisponível. Tente novamente.' },
      { status: invalidCredentials || error instanceof ZodError ? 401 : 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
