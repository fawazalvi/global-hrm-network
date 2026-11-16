import { NextResponse } from 'next/server';
import { db } from '@/backend/db';
import { requireAdminSession } from '@/backend/email/admin-auth';
import {
  computeSmtpConfigHash,
  redactEmailConfig,
  testSmtpConfig,
} from '@/backend/email/service';

export async function POST() {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;
  const { session } = authCheck;

  try {
    const target =
      (await db.emailConfig.findFirst({
        where: { status: 'draft' },
        orderBy: { version: 'desc' },
      })) ||
      (await db.emailConfig.findFirst({
        where: { status: 'active' },
        orderBy: { version: 'desc' },
      }));

    if (!target) {
      return NextResponse.json(
        { error: 'Please save a draft configuration before testing SMTP.' },
        { status: 400 }
      );
    }

    const result = await testSmtpConfig(target);
    const testedHash = result.success ? computeSmtpConfigHash(target) : null;

    const updated = await db.emailConfig.update({
      where: { id: target.id },
      data: {
        lastSmtpTestAt: new Date(),
        lastSmtpTestSuccess: result.success,
        lastSmtpTestMessage: result.message,
        lastSmtpTestedHash: testedHash,
      },
    });

    await db.emailConfigAuditLog.create({
      data: {
        configId: target.id,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'smtp_tested',
        summary: result.success
          ? `SMTP connection test succeeded for ${target.smtpHost}:${target.smtpPort}.`
          : `SMTP connection test failed: ${result.message}`,
      },
    });

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        config: redactEmailConfig(updated),
      },
      { status: result.success ? 200 : 400 }
    );
  } catch (error: any) {
    console.error('Error testing SMTP:', error);
    return NextResponse.json({ error: 'SMTP test failed unexpectedly.' }, { status: 500 });
  }
}
