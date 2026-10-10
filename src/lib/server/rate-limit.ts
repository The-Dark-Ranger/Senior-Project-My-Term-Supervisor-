/**
 * Fixed-window in-memory rate limiter (per server instance).
 * Good enough to stop casual abuse of the AI endpoint; use a shared store
 * (e.g. Redis/Upstash) if you run many instances.
 */

const MAX_TRACKED_KEYS = 10_000;
const windows = new Map<string, { start: number; count: number }>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const current = windows.get(key);
  if (!current || now - current.start >= windowMs) {
    if (windows.size >= MAX_TRACKED_KEYS) {
      // Drop expired windows first; if still full, drop the oldest entry.
      for (const [k, w] of windows) if (now - w.start >= windowMs) windows.delete(k);
      if (windows.size >= MAX_TRACKED_KEYS) windows.delete(windows.keys().next().value!);
    }
    windows.set(key, { start: now, count: 1 });
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((current.start + windowMs - now) / 1000) };
  }
  current.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

/** Best-effort client IP. Only trust x-forwarded-for behind a proxy that sets it (Vercel, App Hosting, Nginx). */
export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown';
}
