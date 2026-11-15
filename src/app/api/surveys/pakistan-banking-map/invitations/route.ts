import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { isDatabaseUnavailableError } from '@/backend/db';
import { resolveSiteOrigin } from '@/backend/survey-email';
import { getActiveReferralSession } from '@/backend/survey-referral-session';
import {
  getParticipantReferralState,
  PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG,
  sendParticipantInvitations,
  SurveyDomainError,
} from '@/backend/survey-service';
import { SurveySendInvitationsSchema } from '@/backend/survey-validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getActiveReferralSession();
    if (!session || session.campaignSlug !== PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG) {
      return NextResponse.json({ error: 'Verified participant session required.' }, { status: 401 });
    }

    const state = await getParticipantReferralState(
      session.participantId,
      PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG
    );
    return NextResponse.json(state);
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
    console.error('Error loading referral state:', error);
    return NextResponse.json({ error: 'Unable to load referral details.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getActiveReferralSession();
    if (!session || session.campaignSlug !== PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG) {
      return NextResponse.json({ error: 'Verified participant session required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const validated = SurveySendInvitationsSchema.parse(body);
    const siteOrigin = resolveSiteOrigin(req);

    const result = await sendParticipantInvitations(
      session.participantId,
      PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG,
      validated,
      siteOrigin
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed.',
          details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        { status: 400 }
      );
    }
    if (error instanceof SurveyDomainError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        { error: 'Database is temporarily unavailable. Please try again shortly.' },
        { status: 503 }
      );
    }
    console.error('Error sending referral invitations:', error);
    return NextResponse.json({ error: 'Unable to send invitations.' }, { status: 500 });
  }
}
