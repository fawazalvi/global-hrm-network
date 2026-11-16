import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { db } from '@/backend/db';
import { requireAdminSession } from '@/backend/email/admin-auth';
import { encryptEmailSecret, EmailCryptoError } from '@/backend/email/crypto';
import { redactEmailConfig } from '@/backend/email/service';
import {
  EmailDraftSaveSchema,
  isUnencryptedSmtpAllowed,
  validateMailHostPolicy,
  validateSenderCompatibility,
} from '@/backend/email/validation';

export async function PUT(req: Request) {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;
  const { session } = authCheck;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const parsed = EmailDraftSaveSchema.parse(body);

    // Enforce SMTP security & host policy when SMTP enabled or host provided
    if (parsed.smtpSecurity === 'none_dev_only' && !isUnencryptedSmtpAllowed()) {
      return NextResponse.json(
        {
          error:
            'Unencrypted SMTP is only allowed in an explicitly configured local development environment (NODE_ENV !== production and EMAIL_ALLOW_UNENCRYPTED_SMTP=true).',
        },
        { status: 400 }
      );
    }

    if (parsed.smtpEnabled) {
      if (!parsed.smtpHost) {
        return NextResponse.json(
          { error: 'SMTP hostname is required when outgoing email is enabled.' },
          { status: 400 }
        );
      }
      const smtpHostCheck = validateMailHostPolicy(parsed.smtpHost, parsed.smtpPort, 'smtp');
      if (!smtpHostCheck.valid) {
        return NextResponse.json({ error: smtpHostCheck.error }, { status: 400 });
      }
      if (!parsed.fromEmail) {
        return NextResponse.json(
          { error: 'From email address is required when outgoing email is enabled.' },
          { status: 400 }
        );
      }
      const senderCheck = validateSenderCompatibility({
        fromEmail: parsed.fromEmail,
        smtpUsername: parsed.smtpUsername,
      });
      if (!senderCheck.valid) {
        return NextResponse.json({ error: senderCheck.error }, { status: 400 });
      }
    } else if (parsed.smtpHost) {
      const smtpHostCheck = validateMailHostPolicy(parsed.smtpHost, parsed.smtpPort, 'smtp');
      if (!smtpHostCheck.valid) {
        return NextResponse.json({ error: smtpHostCheck.error }, { status: 400 });
      }
    }

    // Enforce IMAP host policy when IMAP enabled or host provided
    if (parsed.imapEnabled) {
      if (!parsed.imapHost) {
        return NextResponse.json(
          { error: 'IMAP hostname is required when incoming email is enabled.' },
          { status: 400 }
        );
      }
      const imapHostCheck = validateMailHostPolicy(parsed.imapHost, parsed.imapPort, 'imap');
      if (!imapHostCheck.valid) {
        return NextResponse.json({ error: imapHostCheck.error }, { status: 400 });
      }
      if (!parsed.imapUsername) {
        return NextResponse.json(
          { error: 'IMAP username is required when incoming email is enabled.' },
          { status: 400 }
        );
      }
    } else if (parsed.imapHost) {
      const imapHostCheck = validateMailHostPolicy(parsed.imapHost, parsed.imapPort, 'imap');
      if (!imapHostCheck.valid) {
        return NextResponse.json({ error: imapHostCheck.error }, { status: 400 });
      }
    }

    // Find existing draft or clone from active
    const [existingDraft, existingActive] = await Promise.all([
      db.emailConfig.findFirst({ where: { status: 'draft' }, orderBy: { version: 'desc' } }),
      db.emailConfig.findFirst({ where: { status: 'active' }, orderBy: { version: 'desc' } }),
    ]);

    const baseSecretSource = existingDraft || existingActive;
    let smtpPasswordEncrypted = baseSecretSource?.smtpPasswordEncrypted || null;
    let imapPasswordEncrypted = baseSecretSource?.imapPasswordEncrypted || null;
    const auditActions: Array<{ action: string; summary: string }> = [];

    if (parsed.smtpPasswordAction === 'replace') {
      if (!parsed.smtpPassword || !parsed.smtpPassword.trim()) {
        return NextResponse.json(
          { error: 'Please enter a new SMTP password to replace the stored credential.' },
          { status: 400 }
        );
      }
      smtpPasswordEncrypted = encryptEmailSecret(parsed.smtpPassword);
      auditActions.push({
        action: 'smtp_password_replaced',
        summary: 'SMTP credential was replaced and encrypted at rest.',
      });
    } else if (parsed.smtpPasswordAction === 'remove') {
      smtpPasswordEncrypted = null;
      auditActions.push({
        action: 'smtp_password_removed',
        summary: 'Stored SMTP credential was removed from draft.',
      });
    }

    if (parsed.imapPasswordAction === 'replace') {
      if (!parsed.imapPassword || !parsed.imapPassword.trim()) {
        return NextResponse.json(
          { error: 'Please enter a new IMAP password to replace the stored credential.' },
          { status: 400 }
        );
      }
      imapPasswordEncrypted = encryptEmailSecret(parsed.imapPassword);
      auditActions.push({
        action: 'imap_password_replaced',
        summary: 'IMAP credential was replaced and encrypted at rest.',
      });
    } else if (parsed.imapPasswordAction === 'remove') {
      imapPasswordEncrypted = null;
      auditActions.push({
        action: 'imap_password_removed',
        summary: 'Stored IMAP credential was removed from draft.',
      });
    }

    const dataPayload = {
      smtpEnabled: parsed.smtpEnabled,
      smtpHost: parsed.smtpHost || null,
      smtpPort: parsed.smtpPort,
      smtpSecurity: parsed.smtpSecurity,
      smtpAuthEnabled: parsed.smtpAuthEnabled,
      smtpUsername: parsed.smtpUsername || null,
      smtpPasswordEncrypted,
      smtpConnectionTimeoutMs: parsed.smtpConnectionTimeoutMs,
      smtpRateLimitPerMinute: parsed.smtpRateLimitPerMinute,
      smtpMaxRetries: parsed.smtpMaxRetries,
      fromDisplayName: parsed.fromDisplayName,
      fromEmail: parsed.fromEmail || null,
      replyToEmail: parsed.replyToEmail || null,
      supportEmail: parsed.supportEmail || null,
      footerText: parsed.footerText || null,
      websiteUrl: parsed.websiteUrl || null,
      senderOverridesJson: parsed.senderOverrides
        ? JSON.stringify(parsed.senderOverrides)
        : null,
      imapEnabled: parsed.imapEnabled,
      imapHost: parsed.imapHost || null,
      imapPort: parsed.imapPort,
      imapSecurity: parsed.imapSecurity,
      imapUsername: parsed.imapUsername || null,
      imapPasswordEncrypted,
      imapFolder: parsed.imapFolder,
      imapPollingIntervalSec: parsed.imapPollingIntervalSec,
      imapInitialSyncMode: parsed.imapInitialSyncMode,
      imapRetentionDays: parsed.imapRetentionDays,
      updatedByUserId: session.user.id,
    };

    let savedDraft;
    if (existingDraft) {
      savedDraft = await db.emailConfig.update({
        where: { id: existingDraft.id },
        data: dataPayload,
      });
    } else {
      const nextVersion = (existingActive?.version || 0) + 1;
      savedDraft = await db.emailConfig.create({
        data: {
          ...dataPayload,
          status: 'draft',
          version: nextVersion,
        },
      });
    }

    await db.emailConfigAuditLog.create({
      data: {
        configId: savedDraft.id,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'draft_saved',
        summary: `Saved email configuration draft (v${savedDraft.version}).`,
      },
    });

    for (const item of auditActions) {
      await db.emailConfigAuditLog.create({
        data: {
          configId: savedDraft.id,
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: item.action,
          summary: item.summary,
        },
      });
    }

    return NextResponse.json({
      success: true,
      draft: redactEmailConfig(savedDraft),
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed.',
          details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        { status: 400 }
      );
    }
    if (error instanceof EmailCryptoError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error('Error saving draft email settings:', error);
    return NextResponse.json({ error: 'Failed to save draft email settings.' }, { status: 500 });
  }
}
