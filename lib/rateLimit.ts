// In-memory sliding-window rate limiter.
// Keyed by an opaque string (API key hash). Each key gets its own quota.
// Default: 60 requests per 60 seconds. Resets on deploy/restart — acceptable
// when maxInstances is 1 (see apphosting.yaml).

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 60;

interface Entry {
  timestamps: number[];
}

const store = new Map<string, Entry>();

/** Periodically purge expired entries to avoid unbounded growth. */
const PURGE_INTERVAL_MS = 5 * 60_000;
let lastPurge = Date.now();

function purge(windowMs: number) {
  const now = Date.now();
  if (now - lastPurge < PURGE_INTERVAL_MS) return;
  lastPurge = now;
  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check whether `key` is within its rate-limit window.
 * Call this **before** processing the request; if `allowed` is false, return 429.
 */
export function checkRateLimit(
  key: string,
  maxRequests = DEFAULT_MAX_REQUESTS,
  windowMs = DEFAULT_WINDOW_MS,
): RateLimitResult {
  const now = Date.now();
  purge(windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Drop timestamps outside the current window.
  const cutoff = now - windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0];
    const retryAfterMs = oldest + windowMs - now;
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(retryAfterMs, 1) };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: maxRequests - entry.timestamps.length, retryAfterMs: 0 };
}
