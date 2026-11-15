import { NextResponse } from 'next/server';
import { handleAdminApiError, requireAdminActor } from '@/backend/admin-auth-guard';
import { exportChoicesCsv, type ManagedEntityType } from '@/backend/admin-choices-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authRes = await requireAdminActor();
    if (authRes.errorResponse) return authRes.errorResponse;

    const url = new URL(req.url);
    const entityType = (url.searchParams.get('entityType') || 'institution') as ManagedEntityType;
    const csv = await exportChoicesCsv(entityType);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ghrm-${entityType}-choices.csv"`,
      },
    });
  } catch (error: unknown) {
    return handleAdminApiError(error, 'Unable to export choices CSV.');
  }
}
