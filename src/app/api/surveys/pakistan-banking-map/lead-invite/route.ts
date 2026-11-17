import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { db, isDatabaseUnavailableError } from '@/backend/db';

function hashInviteToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawToken = searchParams.get('token')?.trim() || '';

    if (!rawToken || rawToken.length < 16) {
      return NextResponse.json(
        { valid: false, status: 'invalid', message: 'Invalid invitation token.' },
        { status: 400 }
      );
    }

    const tokenHash = hashInviteToken(rawToken);
    const invite = await db.surveyLeadInvite.findUnique({
      where: { tokenHash },
    });

    if (!invite) {
      return NextResponse.json(
        { valid: false, status: 'invalid', message: 'This invitation link is not valid.' },
        { status: 404 }
      );
    }

    const now = new Date();
    if (invite.expiresAt < now) {
      return NextResponse.json(
        {
          valid: false,
          status: 'expired',
          expiresAt: invite.expiresAt.toISOString(),
          message: 'This survey invitation link has expired. Please request a new invitation.',
        },
        { status: 410 }
      );
    }

    await db.surveyLeadInvite.update({
      where: { id: invite.id },
      data: {
        openedAt: invite.openedAt ?? now,
        lastOpenedAt: now,
        openCount: { increment: 1 },
      },
    });

    return NextResponse.json({
      valid: true,
      status: 'active',
      expiresAt: invite.expiresAt.toISOString(),
    });
  } catch (error: unknown) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        { valid: true, status: 'unavailable', message: 'Database unavailable' },
        { status: 503 }
      );
    }
    console.error('Error validating lead invite token:', error);
    return NextResponse.json(
      { valid: false, status: 'error', message: 'Unable to verify invitation link.' },
      { status: 500 }
    );
  }
}
