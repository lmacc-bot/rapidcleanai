type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __rapidcleanaiRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const rateLimitStore = globalThis.__rapidcleanaiRateLimitStore ?? new Map<string, RateLimitEntry>();
globalThis.__rapidcleanaiRateLimitStore = rateLimitStore;

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  // MVP note: this limiter is instance-local. For production-scale, replace it with
  // a shared store such as Redis/Upstash so limits apply consistently across instances.
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const freshEntry = {
      count: 1,
      resetAt: now + windowMs,
    };

    rateLimitStore.set(key, freshEntry);

    return {
      allowed: true,
      limit,
      remaining: Math.max(limit - freshEntry.count, 0),
      resetAt: freshEntry.resetAt,
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);

  return {
    allowed: true,
    limit,
    remaining: Math.max(limit - existing.count, 0),
    resetAt: existing.resetAt,
  };
}
