import { NextResponse } from 'next/server';
import { isDatabaseUnavailableError } from '@/backend/db';
import {
  getSurveyCampaignMetadata,
  PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG,
  SurveyDomainError,
} from '@/backend/survey-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const metadata = await getSurveyCampaignMetadata(PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG);
    return NextResponse.json(metadata);
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
    console.error('Error loading survey metadata:', error);
    return NextResponse.json({ error: 'Unable to load survey details.' }, { status: 500 });
  }
}
