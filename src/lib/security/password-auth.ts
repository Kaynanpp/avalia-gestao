export class InvalidCredentialsError extends Error {}

export async function authenticateWithFirebase(email: string, password: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error('Firebase Web API não configurada.');
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const base = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' && emulatorHost
    ? `http://${emulatorHost}/identitytoolkit.googleapis.com/v1`
    : 'https://identitytoolkit.googleapis.com/v1';
  const response = await fetch(`${base}/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status >= 500) throw new Error('Authentication service unavailable');
  const payload = await response.json() as { idToken?: string; error?: { message?: string } };
  if (!response.ok) {
    const reason = payload.error?.message?.split(' : ')[0];
    if (reason && ['INVALID_LOGIN_CREDENTIALS', 'INVALID_PASSWORD', 'EMAIL_NOT_FOUND', 'USER_DISABLED'].includes(reason)) {
      throw new InvalidCredentialsError();
    }
    // API restrictions, quota and disabled providers are operational failures,
    // rather than evidence that the user's password is wrong.
    throw new Error('Authentication service unavailable');
  }
  if (!payload.idToken) throw new InvalidCredentialsError();
  return payload.idToken;
}
