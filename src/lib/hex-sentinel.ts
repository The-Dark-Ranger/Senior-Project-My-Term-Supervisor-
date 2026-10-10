/**
 * Hex Sentinel Lite - in-app honeypot traps.
 *
 * Legitimate users never request these paths; automated scanners do. Any hit is
 * therefore treated as suspicious, logged as structured JSON and (optionally)
 * forwarded to an alert webhook. The full Hex Sentinel deployment described in
 * the project report runs separately (e.g. on a Raspberry Pi) - this module
 * brings the same "decoy, log, alert" idea into the web app itself.
 */

import { rateLimit } from '@/lib/server/rate-limit';

/** Alert throttling so a scanner hammering trap URLs cannot flood the webhook. */
const ALERTS_PER_IP_PER_MINUTE = 1;
const ALERTS_PER_MINUTE = 20;

export interface TrapEvent {
  event: 'hex-sentinel.trap';
  timestamp: string;
  ip: string;
  method: string;
  path: string;
  query: string;
  userAgent: string;
  referer: string;
}

export function isHexSentinelEnabled(): boolean {
  return process.env.HEX_SENTINEL_ENABLED !== 'false';
}

const clip = (value: string | null, max = 300) => (value ?? '').slice(0, max);

export function buildTrapEvent(request: Request): TrapEvent {
  const url = new URL(request.url);
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return {
    event: 'hex-sentinel.trap',
    timestamp: new Date().toISOString(),
    ip: clip(forwarded || request.headers.get('x-real-ip') || 'unknown', 64),
    method: request.method,
    path: clip(url.pathname),
    query: clip(url.search),
    userAgent: clip(request.headers.get('user-agent')),
    referer: clip(request.headers.get('referer')),
  };
}

/**
 * Logs every event and, if HEX_SENTINEL_WEBHOOK_URL is set, posts a (throttled) JSON alert. Never throws.
 * JSON.stringify escapes control characters, so attacker-controlled fields cannot forge log lines.
 */
export async function reportTrapEvent(trap: TrapEvent): Promise<void> {
  console.warn(JSON.stringify(trap));
  const webhook = process.env.HEX_SENTINEL_WEBHOOK_URL;
  if (!webhook || !webhook.startsWith('https://')) return;
  if (!rateLimit(`trap:${trap.ip}`, ALERTS_PER_IP_PER_MINUTE, 60_000).ok) return;
  if (!rateLimit('trap:global', ALERTS_PER_MINUTE, 60_000).ok) return;
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: `Hex Sentinel: ${trap.method} ${trap.path} from ${trap.ip}`, ...trap }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (error) {
    console.error('[hex-sentinel] webhook delivery failed', error);
  }
}
