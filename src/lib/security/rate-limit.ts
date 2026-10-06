import { createHash, createHmac } from 'crypto';
import type { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import {
  evaluateRateLimitAttempt,
  type RateLimitPolicy,
  type RateLimitState,
} from '@/lib/security/rate-limit-policy';

const CLEANUP_GRACE_MS = 24 * 60 * 60 * 1000;

export class RateLimitExceededError extends Error {
  readonly status = 429;

  constructor(public readonly retryAfterSeconds: number) {
    super('Muitas tentativas. Aguarde um pouco e tente novamente.');
    this.name = 'RateLimitExceededError';
  }
}

function positiveInteger(name: string, fallback: number, minimum: number, maximum: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= minimum && value <= maximum ? value : fallback;
}

export function loginRateLimitPolicy(): RateLimitPolicy {
  return {
    limit: positiveInteger('RATE_LIMIT_LOGIN_MAX', 8, 3, 100),
    windowMs: positiveInteger('RATE_LIMIT_LOGIN_WINDOW_SECONDS', 900, 60, 86400) * 1000,
    blockMs: positiveInteger('RATE_LIMIT_LOGIN_BLOCK_SECONDS', 900, 60, 86400) * 1000,
  };
}

export function identificationRateLimitPolicy(): RateLimitPolicy {
  return {
    limit: positiveInteger('RATE_LIMIT_IDENTIFICATION_MAX', 10, 3, 100),
    windowMs: positiveInteger('RATE_LIMIT_IDENTIFICATION_WINDOW_SECONDS', 900, 60, 86400) * 1000,
    blockMs: positiveInteger('RATE_LIMIT_IDENTIFICATION_BLOCK_SECONDS', 600, 30, 86400) * 1000,
  };
}

export function sourceRateLimitPolicy(): RateLimitPolicy {
  return {
    limit: positiveInteger('RATE_LIMIT_SOURCE_MAX', 60, 10, 1000),
    windowMs: positiveInteger('RATE_LIMIT_SOURCE_WINDOW_SECONDS', 300, 60, 86400) * 1000,
    blockMs: positiveInteger('RATE_LIMIT_SOURCE_BLOCK_SECONDS', 300, 30, 86400) * 1000,
  };
}

export function sensitiveActionRateLimitPolicy(): RateLimitPolicy {
  return {
    limit: positiveInteger('RATE_LIMIT_SENSITIVE_MAX', 30, 5, 500),
    windowMs: positiveInteger('RATE_LIMIT_SENSITIVE_WINDOW_SECONDS', 900, 60, 86400) * 1000,
    blockMs: positiveInteger('RATE_LIMIT_SENSITIVE_BLOCK_SECONDS', 900, 60, 86400) * 1000,
  };
}

export function credentialActionRateLimitPolicy(): RateLimitPolicy {
  return {
    limit: positiveInteger('RATE_LIMIT_CREDENTIAL_MAX', 8, 3, 100),
    windowMs: positiveInteger('RATE_LIMIT_CREDENTIAL_WINDOW_SECONDS', 900, 60, 86400) * 1000,
    blockMs: positiveInteger('RATE_LIMIT_CREDENTIAL_BLOCK_SECONDS', 900, 60, 86400) * 1000,
  };
}

function rateLimitSecret() {
  const configured = process.env.RATE_LIMIT_SECRET?.trim() || process.env.PARTICIPATION_SECRET?.trim();
  if (configured && configured.length >= 32) return configured;

  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
    return `emulator-rate-limit:${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-avalia-gestao'}`;
  }

  throw new Error('Configure RATE_LIMIT_SECRET ou PARTICIPATION_SECRET com pelo menos 32 caracteres.');
}

function documentId(scope: string, key: string) {
  const secretKey = createHash('sha256').update(`rate-limit:v1:${rateLimitSecret()}`).digest();
  return createHmac('sha256', secretKey).update(`${scope}\u0000${key}`).digest('hex');
}

function storedMillis(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return (value as { toMillis(): number }).toMillis();
  }
  return undefined;
}

function storedState(data: FirebaseFirestore.DocumentData | undefined): RateLimitState | null {
  if (!data) return null;
  const windowStartedAt = storedMillis(data.windowStartedAt);
  if (!windowStartedAt) return null;
  const blockedUntil = storedMillis(data.blockedUntil);
  return {
    count: Number.isInteger(data.count) && data.count >= 0 ? data.count : 0,
    windowStartedAt,
    ...(blockedUntil ? { blockedUntil } : {}),
  };
}

export async function consumeRateLimit(scope: string, key: string, policy: RateLimitPolicy) {
  if (!scope || !key) throw new Error('Rate limit inválido.');
  const reference = adminDb.collection(COLLECTIONS.SECURITY_RATE_LIMITS).doc(documentId(scope, key));
  const now = Date.now();
  let allowed = false;
  let retryAfterSeconds = 1;

  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const decision = evaluateRateLimitAttempt(storedState(snapshot.data()), policy, now);
    allowed = decision.allowed;
    retryAfterSeconds = decision.retryAfterSeconds;
    const expirationBase = Math.max(
      decision.nextState.windowStartedAt + policy.windowMs,
      decision.nextState.blockedUntil || 0,
    );
    transaction.set(reference, {
      scope,
      count: decision.nextState.count,
      windowStartedAt: new Date(decision.nextState.windowStartedAt),
      blockedUntil: decision.nextState.blockedUntil ? new Date(decision.nextState.blockedUntil) : null,
      expiresAt: new Date(expirationBase + CLEANUP_GRACE_MS),
      updatedAt: new Date(now),
    });
  });

  if (!allowed) throw new RateLimitExceededError(retryAfterSeconds);
}

export async function clearRateLimit(scope: string, key: string) {
  await adminDb.collection(COLLECTIONS.SECURITY_RATE_LIMITS).doc(documentId(scope, key)).delete();
}

export function trustedClientAddress(request: NextRequest): string | null {
  const platformAddress = (request as NextRequest & { ip?: string }).ip?.trim();
  if (platformAddress) return platformAddress;
  if (process.env.TRUST_PROXY !== 'true') return null;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || null;
}

export async function enforceRequestRateLimit(
  request: NextRequest,
  scope: string,
  subject: string,
  subjectPolicy: RateLimitPolicy,
) {
  const source = trustedClientAddress(request);
  if (source) await consumeRateLimit(`${scope}:source`, source, sourceRateLimitPolicy());
  await consumeRateLimit(`${scope}:subject`, subject, subjectPolicy);
}

export function rateLimitHeaders(error: RateLimitExceededError) {
  return {
    'Cache-Control': 'no-store',
    'Retry-After': String(error.retryAfterSeconds),
  };
}
