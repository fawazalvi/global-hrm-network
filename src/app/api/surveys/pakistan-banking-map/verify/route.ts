import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { isDatabaseUnavailableError, db } from '@/backend/db';
import { attachReferralSessionCookie } from '@/backend/survey-referral-session';
import {
  PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG,
  SurveyDomainError,
  verifySurveySubmissionToken,
} from '@/backend/survey-service';
import { SurveyVerifyTokenSchema } from '@/backend/survey-validation';
import { resolveSiteOrigin, sendParticipationConfirmationEmail } from '@/backend/survey-email';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const { token } = SurveyVerifyTokenSchema.parse(body);
    const result = await verifySurveySubmissionToken(token);

    // Dispatch participation confirmation via centralized email service
    const sub = await db.surveySubmission.findUnique({
      where: { id: result.submissionId },
      select: { officialEmail: true, campaignId: true, campaign: { select: { title: true } } },
    });
    if (sub?.officialEmail) {
      const origin = resolveSiteOrigin(req);
      await sendParticipationConfirmationEmail({
        toEmail: sub.officialEmail,
        preferredName: result.preferredName,
        submissionId: result.submissionId,
        participantId: result.participantId,
        campaignId: sub.campaignId,
        campaignTitle: sub.campaign.title,
        confirmationUrl: `${origin}/surveys/pakistan-banking-map`,
      }).catch((err) => console.error('Confirmation email dispatch error:', err));
    }

    const response = NextResponse.json({
      success: true,
      ...result,
    });

    attachReferralSessionCookie(
      response,
      result.participantId,
      PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG
    );

    return response;
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
    console.error('Error verifying survey token:', error);
    return NextResponse.json({ error: 'Unable to verify survey submission.' }, { status: 500 });
  }
}
