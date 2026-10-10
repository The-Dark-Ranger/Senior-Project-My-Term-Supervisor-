import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { buildTrapEvent, isHexSentinelEnabled, reportTrapEvent } from '@/lib/hex-sentinel';

/**
 * Runs only for the decoy paths listed in `config.matcher` (see src/lib/hex-sentinel.ts).
 * Responds with a plain 404 so scanners learn nothing, while the hit is logged.
 */
export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isHexSentinelEnabled()) {
    event.waitUntil(reportTrapEvent(buildTrapEvent(request)));
  }
  return new NextResponse('Not Found', { status: 404, headers: { 'content-type': 'text/plain' } });
}

export const config = {
  matcher: [
    '/.env',
    '/.env.local',
    '/.env.production',
    '/.git/:path*',
    '/.aws/:path*',
    '/wp-login.php',
    '/wp-admin/:path*',
    '/xmlrpc.php',
    '/phpmyadmin/:path*',
    '/pma/:path*',
    '/admin.php',
    '/config.php',
    '/server-status',
    '/backup.sql',
    '/db.sql',
    '/api/admin/export',
  ],
};
