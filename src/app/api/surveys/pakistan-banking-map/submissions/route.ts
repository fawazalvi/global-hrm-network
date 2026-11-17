import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { db, isDatabaseUnavailableError } from '@/backend/db';
import {
  hashIpAddress,
  PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG,
  submitSurveyResponse,
  SurveyDomainError,
} from '@/backend/survey-service';
import { SurveySubmissionInputSchema } from '@/backend/survey-validation';
import { resolveSiteOrigin, sendSurveyVerificationEmail } from '@/backend/survey-email';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const validated = SurveySubmissionInputSchema.parse(body);
    const inviteToken = typeof (body as any).inviteToken === 'string' ? (body as any).inviteToken.trim() : '';

    let matchedInviteId: string | null = null;
    if (inviteToken) {
      const tokenHash = crypto.createHash('sha256').update(inviteToken).digest('hex');
      const invite = await db.surveyLeadInvite.findUnique({ where: { tokenHash } });
      if (invite && invite.expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'This survey invitation link has expired. Please request a new invitation.' },
          { status: 410 }
        );
      }
      if (invite) matchedInviteId = invite.id;
    }

    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : null;
    const ipHash = hashIpAddress(clientIp);

    const result = await submitSurveyResponse(
      PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG,
      validated,
      ipHash
    );

    if (matchedInviteId) {
      await db.surveyLeadInvite.update({
        where: { id: matchedInviteId },
        data: {
          completedAt: new Date(),
          submissionId: result.submissionId,
        },
      }).catch(() => {});
    }

    const origin = resolveSiteOrigin(req);
    const verificationUrl = `${origin}/surveys/pakistan-banking-map/verify?token=${encodeURIComponent(result.rawVerificationToken)}`;

    const emailResult = await sendSurveyVerificationEmail({
      toEmail: validated.officialEmail,
      preferredName: validated.preferredName,
      submissionId: result.submissionId,
      verificationUrl,
      expiresAt: new Date(result.verificationExpiresAt),
    });

    // Note: rawVerificationToken is intentionally omitted from HTTP response;
    // it is intended for server-side verification email dispatch.
    return NextResponse.json(
      {
        success: true,
        submissionId: result.submissionId,
        status: result.status,
        verificationExpiresAt: result.verificationExpiresAt,
        emailDispatched: emailResult.success,
        emailStatus: emailResult.status,
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
