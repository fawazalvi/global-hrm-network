import { NextResponse } from 'next/server';
import { db } from '@/backend/db';
import { requireAdminSession } from '@/backend/email/admin-auth';
import {
  computeImapConfigHash,
  redactEmailConfig,
  testImapConfig,
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
        { error: 'Please save a draft configuration before testing IMAP.' },
        { status: 400 }
      );
    }

    const result = await testImapConfig(target);
    const testedHash = result.success ? computeImapConfigHash(target) : null;

    const updated = await db.emailConfig.update({
      where: { id: target.id },
      data: {
        lastImapTestAt: new Date(),
        lastImapTestSuccess: result.success,
        lastImapTestMessage: result.message,
        lastImapTestedHash: testedHash,
      },
    });

    await db.emailConfigAuditLog.create({
      data: {
        configId: target.id,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'imap_tested',
        summary: result.success
          ? `IMAP read-only connection test succeeded for ${target.imapHost}:${target.imapPort}.`
          : `IMAP connection test failed: ${result.message}`,
      },
    });

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        folders: result.folders || [],
        config: redactEmailConfig(updated),
      },
      { status: result.success ? 200 : 400 }
    );
  } catch (error: any) {
    console.error('Error testing IMAP:', error);
    return NextResponse.json({ error: 'IMAP test failed unexpectedly.' }, { status: 500 });
  }
}
