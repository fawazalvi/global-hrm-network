import { NextResponse } from 'next/server';
import { db } from '@/backend/db';
import { requireAdminSession } from '@/backend/email/admin-auth';
import {
  computeImapConfigHash,
  computeSmtpConfigHash,
  invalidateEmailConfigCache,
  redactEmailConfig,
} from '@/backend/email/service';

export async function POST() {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;
  const { session } = authCheck;

  try {
    const draft = await db.emailConfig.findFirst({
      where: { status: 'draft' },
      orderBy: { version: 'desc' },
    });

    if (!draft) {
      return NextResponse.json(
        { error: 'No draft configuration found to activate.' },
        { status: 400 }
      );
    }

    if (draft.smtpEnabled) {
      const currentSmtpHash = computeSmtpConfigHash(draft);
      if (!draft.lastSmtpTestSuccess || draft.lastSmtpTestedHash !== currentSmtpHash) {
        return NextResponse.json(
          {
            error:
              'A successful "Test SMTP Connection" on the current draft settings is required before activation.',
          },
          { status: 400 }
        );
      }
    }

    if (draft.imapEnabled) {
      const currentImapHash = computeImapConfigHash(draft);
      if (!draft.lastImapTestSuccess || draft.lastImapTestedHash !== currentImapHash) {
        return NextResponse.json(
          {
            error:
              'A successful "Test IMAP Connection" on the current draft settings is required before activating incoming mail.',
          },
          { status: 400 }
        );
      }
    }

    const now = new Date();

    const activated = await db.$transaction(async (tx) => {
      await tx.emailConfig.updateMany({
        where: { status: 'active' },
        data: { status: 'archived' },
      });

      const promoted = await tx.emailConfig.update({
        where: { id: draft.id },
        data: {
          status: 'active',
          activatedAt: now,
          activatedByUserId: session.user.id,
          imapActivatedAt: draft.imapEnabled ? draft.imapActivatedAt || now : draft.imapActivatedAt,
        },
      });

      await tx.emailConfigAuditLog.create({
        data: {
          configId: promoted.id,
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'activated',
          summary: `Activated email configuration v${promoted.version}.`,
        },
      });

      return promoted;
    });

    invalidateEmailConfigCache();

    return NextResponse.json({
      success: true,
      active: redactEmailConfig(activated),
    });
  } catch (error: any) {
    console.error('Error activating email configuration:', error);
    return NextResponse.json({ error: 'Failed to activate configuration.' }, { status: 500 });
  }
}
