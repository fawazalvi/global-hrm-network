import { NextResponse } from 'next/server';
import { auth } from '@/backend/auth';
import { checkDatabaseHealth } from '@/backend/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const health = await checkDatabaseHealth();

  let isAdmin = false;
  try {
    const session = await auth();
    isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';
  } catch {
    // Ignore auth check failures on health endpoint; fall back to public minimal response
    isAdmin = false;
  }

  const basePayload = {
    status: health.ok ? 'ok' : 'degraded',
    database: health.ok ? 'connected' : 'unavailable',
    timestamp: new Date().toISOString(),
  };

  if (isAdmin) {
    return NextResponse.json(
      {
        ...basePayload,
        diagnostics: {
          latencyMs: health.latencyMs ?? null,
          ...(health.errorCode ? { errorCode: health.errorCode } : {}),
          ...(health.error ? { error: health.error } : {}),
        },
      },
      { status: health.ok ? 200 : 503 }
    );
  }

  return NextResponse.json(basePayload, { status: health.ok ? 200 : 503 });
}
