export type RateLimitPolicy = {
  limit: number;
  windowMs: number;
  blockMs: number;
};

export type RateLimitState = {
  count: number;
  windowStartedAt: number;
  blockedUntil?: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  nextState: RateLimitState;
};

/**
 * Pure fixed-window policy. Persistence and concurrency are handled by the
 * Firestore transaction in rate-limit.ts.
 */
export function evaluateRateLimitAttempt(
  current: RateLimitState | null,
  policy: RateLimitPolicy,
  now = Date.now(),
): RateLimitDecision {
  if (current?.blockedUntil && current.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.blockedUntil - now) / 1000)),
      nextState: current,
    };
  }

  const windowExpired = !current || now - current.windowStartedAt >= policy.windowMs;
  const state: RateLimitState = windowExpired
    ? { count: 0, windowStartedAt: now }
    : { count: current.count, windowStartedAt: current.windowStartedAt };

  if (state.count >= policy.limit) {
    const blockedUntil = now + policy.blockMs;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(policy.blockMs / 1000)),
      nextState: { ...state, blockedUntil },
    };
  }

  const nextCount = state.count + 1;
  return {
    allowed: true,
    remaining: Math.max(0, policy.limit - nextCount),
    retryAfterSeconds: 0,
    nextState: { count: nextCount, windowStartedAt: state.windowStartedAt },
  };
}
