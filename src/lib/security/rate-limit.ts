type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __plannerRateLimitStore__: Map<string, Bucket> | undefined;
}

function getStore() {
  if (!globalThis.__plannerRateLimitStore__) {
    globalThis.__plannerRateLimitStore__ = new Map<string, Bucket>();
  }
  return globalThis.__plannerRateLimitStore__;
}

export function consumeRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const store = getStore();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const next: Bucket = {
      count: 1,
      resetAt: now + windowMs
    };
    store.set(key, next);
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSec: Math.ceil(windowMs / 1000)
    };
  }

  current.count += 1;
  store.set(key, current);

  const allowed = current.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - current.count),
    retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  };
}

