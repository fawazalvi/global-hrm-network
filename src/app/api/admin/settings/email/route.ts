import { NextResponse } from 'next/server';
import { db } from '@/backend/db';
import { requireAdminSession } from '@/backend/email/admin-auth';
import { isEncryptionKeyConfigured } from '@/backend/email/crypto';
import { redactEmailConfig } from '@/backend/email/service';

export async function GET() {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;

  try {
    const [active, draft, previousArchived, auditLogs] = await Promise.all([
      db.emailConfig.findFirst({
        where: { status: 'active' },
        orderBy: { version: 'desc' },
      }),
      db.emailConfig.findFirst({
        where: { status: 'draft' },
        orderBy: { version: 'desc' },
      }),
      db.emailConfig.findFirst({
        where: { status: 'archived' },
        orderBy: { version: 'desc' },
        select: { id: true, version: true, activatedAt: true, updatedAt: true },
      }),
      db.emailConfigAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
    ]);

    const keyStatus = isEncryptionKeyConfigured();
    const legacyEnvDetected = Boolean(
      process.env.GMAIL_SERVICE_ACCOUNT_KEY ||
        process.env.GMAIL_CLIENT_EMAIL ||
        process.env.SMTP_HOST
    );

    return NextResponse.json({
      active: active ? redactEmailConfig(active) : null,
      draft: draft ? redactEmailConfig(draft) : active ? redactEmailConfig(active) : null,
      hasRollbackTarget: Boolean(previousArchived),
      rollbackTarget: previousArchived,
      encryptionKeyConfigured: keyStatus.configured,
      encryptionKeyError: keyStatus.error || null,
      legacyEnvDetected,
      auditLogs,
    });
  } catch (error: any) {
    console.error('Error loading email settings:', error);
    return NextResponse.json(
      { error: 'Failed to load email settings.' },
      { status: 500 }
    );
  }
}
