import { describe, expect, it } from 'vitest';
import { clientIp, rateLimit } from './rate-limit';
import { verifyFirebaseIdToken } from './firebase-token';
import { buildTrapEvent } from '@/lib/hex-sentinel';

describe('rateLimit', () => {
  it('allows up to the limit within a window, then blocks', () => {
    const key = `test-${Math.random()}`;
    const t = 1_000_000;
    expect(rateLimit(key, 2, 60_000, t).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000, t + 1).ok).toBe(true);
    const blocked = rateLimit(key, 2, 60_000, t + 2);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('resets after the window passes', () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 1, 1000, 0).ok).toBe(true);
    expect(rateLimit(key, 1, 1000, 500).ok).toBe(false);
    expect(rateLimit(key, 1, 1000, 1000).ok).toBe(true);
  });
});

describe('clientIp', () => {
  it('uses the first x-forwarded-for entry', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});

describe('verifyFirebaseIdToken', () => {
  it('rejects missing or malformed tokens without network access', async () => {
    expect(await verifyFirebaseIdToken(undefined, 'project')).toBeNull();
    expect(await verifyFirebaseIdToken('short', 'project')).toBeNull();
    expect(await verifyFirebaseIdToken('x'.repeat(5000), 'project')).toBeNull();
    expect(await verifyFirebaseIdToken('a'.repeat(40), '')).toBeNull();
  });
});

describe('Hex Sentinel trap events', () => {
  it('clips oversized attacker-controlled fields', () => {
    const request = new Request(`https://example.com/.env?${'q'.repeat(1000)}`, {
      headers: { 'user-agent': 'u'.repeat(1000), 'x-forwarded-for': '198.51.100.1' },
    });
    const event = buildTrapEvent(request);
    expect(event.path).toBe('/.env');
    expect(event.ip).toBe('198.51.100.1');
    expect(event.query.length).toBeLessThanOrEqual(300);
    expect(event.userAgent.length).toBeLessThanOrEqual(300);
  });
});
