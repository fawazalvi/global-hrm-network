import { NextResponse } from 'next/server';
import { auth } from '@/backend/auth';
import { isDatabaseUnavailableError } from '@/backend/db';
import {
  listSurveySubmissionsForAdmin,
  PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG,
  SurveyDomainError,
} from '@/backend/survey-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const limitParam = Number(url.searchParams.get('limit') ?? '50');
    const offsetParam = Number(url.searchParams.get('offset') ?? '0');

    const limit = Number.isFinite(limitParam) ? limitParam : 50;
    const offset = Number.isFinite(offsetParam) ? offsetParam : 0;

    const data = await listSurveySubmissionsForAdmin(
      PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG,
      limit,
      offset
    );

    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof SurveyDomainError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        { error: 'Database is temporarily unavailable. Please try again shortly.' },
        { status: 503 }
      );
    }
    console.error('Error listing survey submissions:', error);
    return NextResponse.json({ error: 'Unable to fetch survey submissions.' }, { status: 500 });
  }
}
