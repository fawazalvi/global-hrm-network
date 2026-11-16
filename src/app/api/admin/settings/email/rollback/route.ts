import { NextResponse } from 'next/server';
import { db } from '@/backend/db';
import { requireAdminSession } from '@/backend/email/admin-auth';
import { invalidateEmailConfigCache, redactEmailConfig } from '@/backend/email/service';

export async function POST() {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;
  const { session } = authCheck;

  try {
    const previous = await db.emailConfig.findFirst({
      where: { status: 'archived' },
      orderBy: { version: 'desc' },
    });

    if (!previous) {
      return NextResponse.json(
        { error: 'No previous archived configuration is available for rollback.' },
        { status: 404 }
      );
    }

    const restored = await db.$transaction(async (tx) => {
      await tx.emailConfig.updateMany({
        where: { status: 'active' },
        data: { status: 'archived' },
      });

      const activeAgain = await tx.emailConfig.update({
        where: { id: previous.id },
        data: {
          status: 'active',
          activatedAt: new Date(),
          activatedByUserId: session.user.id,
        },
      });

      await tx.emailConfigAuditLog.create({
        data: {
          configId: activeAgain.id,
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'rolled_back',
          summary: `Rolled back active email configuration to v${activeAgain.version}.`,
        },
      });

      return activeAgain;
    });

    invalidateEmailConfigCache();

    return NextResponse.json({
      success: true,
      active: redactEmailConfig(restored),
    });
  } catch (error: any) {
    console.error('Error rolling back email configuration:', error);
    return NextResponse.json({ error: 'Failed to roll back configuration.' }, { status: 500 });
  }
}
