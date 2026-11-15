import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { isDatabaseUnavailableError } from '@/backend/db';
import {
  hashIpAddress,
  PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG,
  submitSurveyResponse,
  SurveyDomainError,
} from '@/backend/survey-service';
import { SurveySubmissionInputSchema } from '@/backend/survey-validation';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const validated = SurveySubmissionInputSchema.parse(body);

    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : null;
    const ipHash = hashIpAddress(clientIp);

    const result = await submitSurveyResponse(
      PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG,
      validated,
      ipHash
    );

    // Note: rawVerificationToken is intentionally omitted from HTTP response;
    // it is intended for server-side verification email dispatch.
    return NextResponse.json(
      {
        success: true,
        submissionId: result.submissionId,
        status: result.status,
        verificationExpiresAt: result.verificationExpiresAt,
      },
      { status: 201 }
    );
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
    console.error('Error submitting survey response:', error);
    return NextResponse.json({ error: 'Unable to submit survey response.' }, { status: 500 });
  }
}
