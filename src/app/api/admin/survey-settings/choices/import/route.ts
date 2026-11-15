import { NextResponse } from 'next/server';
import {
  handleAdminApiError,
  requireAdminActor,
  revalidateSurveyPaths,
} from '@/backend/admin-auth-guard';
import {
  applyCsvImport,
  previewCsvImport,
  type ManagedEntityType,
} from '@/backend/admin-choices-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authRes = await requireAdminActor();
    if (authRes.errorResponse) return authRes.errorResponse;

    const body = await req.json();
    const entityType = body.entityType as ManagedEntityType;
    const csvText = String(body.csvText || '');
    const mode = body.mode === 'apply' ? 'apply' : 'preview';

    if (mode === 'preview') {
      const preview = await previewCsvImport(entityType, csvText);
      return NextResponse.json(preview);
    }

    const result = await applyCsvImport(authRes.actor, entityType, csvText);
    revalidateSurveyPaths();
    return NextResponse.json({ applied: true, result });
  } catch (error: unknown) {
    return handleAdminApiError(error, 'Unable to process CSV import.');
  }
}
