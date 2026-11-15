import { NextResponse } from 'next/server';
import { handleAdminApiError, requireAdminActor } from '@/backend/admin-auth-guard';
import { db } from '@/backend/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authRes = await requireAdminActor();
    if (authRes.errorResponse) return authRes.errorResponse;

    const auditLogs = await db.choiceAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 150,
    });
    return NextResponse.json({ auditLogs });
  } catch (error: unknown) {
    return handleAdminApiError(error, 'Unable to load audit logs.');
  }
}
