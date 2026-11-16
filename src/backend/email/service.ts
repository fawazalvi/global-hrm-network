import crypto from 'crypto';
import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPPool from 'nodemailer/lib/smtp-pool';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { EmailConfig } from '@prisma/client';
import { db } from '@/backend/db';
import { normalizeEmail } from '@/backend/survey-validation';
import { decryptEmailSecret, EmailCryptoError } from './crypto';
import {
  isUnencryptedSmtpAllowed,
  validateMailHostPolicy,
  validateSenderCompatibility,
} from './validation';
import { buildSafeTextPreview, sanitizeInboundHtml } from './sanitizer';
import {
  DEFAULT_EMAIL_TEMPLATES,
  normalizeRuntimeVariables,
  renderBrandedEmail,
  validateRequiredRuntimeVariables,
  type ManagedEmailType,
} from './templates';
import { DEFAULT_EMAIL_THEME, type EmailThemePalette } from './layout';

export interface SenderOverride {
  fromDisplayName?: string;
  fromEmail?: string;
  replyToEmail?: string;
}

export interface RedactedEmailConfig {
  id: string;
  status: string;
  version: number;
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: string;
  smtpAuthEnabled: boolean;
  smtpUsername: string;
  hasSmtpPassword: boolean;
  smtpConnectionTimeoutMs: number;
  smtpRateLimitPerMinute: number;
  smtpMaxRetries: number;
  fromDisplayName: string;
  fromEmail: string;
  replyToEmail: string;
  supportEmail: string;
  footerText: string;
  websiteUrl: string;
  senderOverrides: Record<string, SenderOverride>;
  imapEnabled: boolean;
  imapHost: string;
  imapPort: number;
  imapSecurity: string;
  imapUsername: string;
  hasImapPassword: boolean;
  imapFolder: string;
  imapPollingIntervalSec: number;
  imapInitialSyncMode: string;
  imapRetentionDays: number;
  imapActivatedAt: string | null;
  lastSmtpTestAt: string | null;
  lastSmtpTestSuccess: boolean | null;
  lastSmtpTestMessage: string | null;
  smtpTestMatchesCurrentDraft: boolean;
  lastImapTestAt: string | null;
  lastImapTestSuccess: boolean | null;
  lastImapTestMessage: string | null;
  imapTestMatchesCurrentDraft: boolean;
  activatedAt: string | null;
  updatedAt: string;
}

// Module-level cache for active configuration and pooled SMTP transporter
let cachedActiveConfig: EmailConfig | null | undefined = undefined;
let cachedConfigLoadedAt = 0;
const CONFIG_CACHE_TTL_MS = 30_000;

let cachedTransporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;
let cachedTransporterKey = '';

export function invalidateEmailConfigCache(): void {
  cachedActiveConfig = undefined;
  cachedConfigLoadedAt = 0;
  if (cachedTransporter) {
    try {
      cachedTransporter.close();
    } catch {
      // ignore close errors
    }
    cachedTransporter = null;
    cachedTransporterKey = '';
  }
}

export async function getActiveEmailConfig(): Promise<EmailConfig | null> {
  const now = Date.now();
  if (cachedActiveConfig !== undefined && now - cachedConfigLoadedAt < CONFIG_CACHE_TTL_MS) {
    return cachedActiveConfig;
  }

  const active = await db.emailConfig.findFirst({
    where: { status: 'active' },
    orderBy: { version: 'desc' },
  });

  cachedActiveConfig = active;
  cachedConfigLoadedAt = now;
  return active;
}

export function computeSmtpConfigHash(cfg: {
  smtpEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number;
  smtpSecurity: string;
  smtpAuthEnabled: boolean;
  smtpUsername: string | null;
  smtpPasswordEncrypted: string | null;
  fromEmail: string | null;
}): string {
  const payload = JSON.stringify({
    smtpEnabled: cfg.smtpEnabled,
    smtpHost: cfg.smtpHost || '',
    smtpPort: cfg.smtpPort,
    smtpSecurity: cfg.smtpSecurity,
    smtpAuthEnabled: cfg.smtpAuthEnabled,
    smtpUsername: cfg.smtpUsername || '',
    hasPass: Boolean(cfg.smtpPasswordEncrypted),
    passHash: cfg.smtpPasswordEncrypted
      ? crypto.createHash('sha256').update(cfg.smtpPasswordEncrypted).digest('hex').slice(0, 16)
      : '',
    fromEmail: cfg.fromEmail || '',
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function computeImapConfigHash(cfg: {
  imapEnabled: boolean;
  imapHost: string | null;
  imapPort: number;
  imapSecurity: string;
  imapUsername: string | null;
  imapPasswordEncrypted: string | null;
  imapFolder: string;
}): string {
  const payload = JSON.stringify({
    imapEnabled: cfg.imapEnabled,
    imapHost: cfg.imapHost || '',
    imapPort: cfg.imapPort,
    imapSecurity: cfg.imapSecurity,
    imapUsername: cfg.imapUsername || '',
    hasPass: Boolean(cfg.imapPasswordEncrypted),
    passHash: cfg.imapPasswordEncrypted
      ? crypto.createHash('sha256').update(cfg.imapPasswordEncrypted).digest('hex').slice(0, 16)
      : '',
    imapFolder: cfg.imapFolder,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function redactEmailConfig(cfg: EmailConfig): RedactedEmailConfig {
  let senderOverrides: Record<string, SenderOverride> = {};
  if (cfg.senderOverridesJson) {
    try {
      senderOverrides = JSON.parse(cfg.senderOverridesJson);
    } catch {
      senderOverrides = {};
    }
  }

  const smtpHash = computeSmtpConfigHash(cfg);
  const imapHash = computeImapConfigHash(cfg);

  return {
    id: cfg.id,
    status: cfg.status,
    version: cfg.version,
    smtpEnabled: cfg.smtpEnabled,
    smtpHost: cfg.smtpHost || '',
    smtpPort: cfg.smtpPort,
    smtpSecurity: cfg.smtpSecurity,
    smtpAuthEnabled: cfg.smtpAuthEnabled,
    smtpUsername: cfg.smtpUsername || '',
    hasSmtpPassword: Boolean(cfg.smtpPasswordEncrypted),
    smtpConnectionTimeoutMs: cfg.smtpConnectionTimeoutMs,
    smtpRateLimitPerMinute: cfg.smtpRateLimitPerMinute,
    smtpMaxRetries: cfg.smtpMaxRetries,
    fromDisplayName: cfg.fromDisplayName,
    fromEmail: cfg.fromEmail || '',
    replyToEmail: cfg.replyToEmail || '',
    supportEmail: cfg.supportEmail || '',
    footerText: cfg.footerText || '',
    websiteUrl: cfg.websiteUrl || '',
    senderOverrides,
    imapEnabled: cfg.imapEnabled,
    imapHost: cfg.imapHost || '',
    imapPort: cfg.imapPort,
    imapSecurity: cfg.imapSecurity,
    imapUsername: cfg.imapUsername || '',
    hasImapPassword: Boolean(cfg.imapPasswordEncrypted),
    imapFolder: cfg.imapFolder,
    imapPollingIntervalSec: cfg.imapPollingIntervalSec,
    imapInitialSyncMode: cfg.imapInitialSyncMode,
    imapRetentionDays: cfg.imapRetentionDays,
    imapActivatedAt: cfg.imapActivatedAt ? cfg.imapActivatedAt.toISOString() : null,
    lastSmtpTestAt: cfg.lastSmtpTestAt ? cfg.lastSmtpTestAt.toISOString() : null,
    lastSmtpTestSuccess: cfg.lastSmtpTestSuccess,
    lastSmtpTestMessage: cfg.lastSmtpTestMessage,
    smtpTestMatchesCurrentDraft: Boolean(
      cfg.lastSmtpTestSuccess && cfg.lastSmtpTestedHash === smtpHash
    ),
    lastImapTestAt: cfg.lastImapTestAt ? cfg.lastImapTestAt.toISOString() : null,
    lastImapTestSuccess: cfg.lastImapTestSuccess,
    lastImapTestMessage: cfg.lastImapTestMessage,
    imapTestMatchesCurrentDraft: Boolean(
      cfg.lastImapTestSuccess && cfg.lastImapTestedHash === imapHash
    ),
    activatedAt: cfg.activatedAt ? cfg.activatedAt.toISOString() : null,
    updatedAt: cfg.updatedAt.toISOString(),
  };
}

function buildSmtpTransportOptions(
  cfg: EmailConfig,
  pooled: boolean
): SMTPPool.Options | SMTPTransport.Options {
  if (!cfg.smtpHost) {
    throw new Error('SMTP hostname is not configured.');
  }

  const hostCheck = validateMailHostPolicy(cfg.smtpHost, cfg.smtpPort, 'smtp');
  if (!hostCheck.valid) {
    throw new Error(hostCheck.error);
  }

  if (cfg.smtpSecurity === 'none_dev_only' && !isUnencryptedSmtpAllowed()) {
    throw new Error(
      'Unencrypted SMTP is blocked in production. Use implicit_tls or starttls.'
    );
  }

  let authConfig: SMTPTransport.Options['auth'] = undefined;
  if (cfg.smtpAuthEnabled) {
    if (!cfg.smtpUsername || !cfg.smtpPasswordEncrypted) {
      throw new Error('SMTP authentication is enabled, but username or password is missing.');
    }
    const password = decryptEmailSecret(cfg.smtpPasswordEncrypted);
    authConfig = {
      user: cfg.smtpUsername,
      pass: password,
    };
  }

  const isImplicitTls = cfg.smtpSecurity === 'implicit_tls';
  const isStartTls = cfg.smtpSecurity === 'starttls';

  const base = {
    host: hostCheck.host,
    port: cfg.smtpPort,
    secure: isImplicitTls,
    requireTLS: isStartTls,
    ignoreTLS: cfg.smtpSecurity === 'none_dev_only',
    auth: authConfig,
    connectionTimeout: cfg.smtpConnectionTimeoutMs,
    greetingTimeout: cfg.smtpConnectionTimeoutMs,
    socketTimeout: cfg.smtpConnectionTimeoutMs * 2,
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2' as const,
    },
  };

  if (pooled) {
    return {
      ...base,
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
    } satisfies SMTPPool.Options;
  }

  return base;
}

function getPooledSmtpTransporter(cfg: EmailConfig): Transporter<SMTPTransport.SentMessageInfo> {
  const key = `${cfg.id}:${cfg.version}:${cfg.updatedAt.getTime()}`;
  if (cachedTransporter && cachedTransporterKey === key) {
    return cachedTransporter;
  }

  if (cachedTransporter) {
    try {
      cachedTransporter.close();
    } catch {
      // ignore
    }
  }

  const options = buildSmtpTransportOptions(cfg, true);
  cachedTransporter = nodemailer.createTransport(options as SMTPPool.Options);
  cachedTransporterKey = key;
  return cachedTransporter;
}

export async function testSmtpConfig(cfg: EmailConfig): Promise<{
  success: boolean;
  message: string;
}> {
  if (!cfg.smtpHost) {
    return { success: false, message: 'SMTP hostname is required.' };
  }
  if (!cfg.fromEmail) {
    return { success: false, message: 'From email address is required.' };
  }
  const senderCheck = validateSenderCompatibility({
    fromEmail: cfg.fromEmail,
    smtpUsername: cfg.smtpUsername,
  });
  if (!senderCheck.valid) {
    return { success: false, message: senderCheck.error! };
  }

  let transport: Transporter<SMTPTransport.SentMessageInfo> | null = null;
  try {
    const options = buildSmtpTransportOptions(cfg, false);
    transport = nodemailer.createTransport(options as SMTPTransport.Options);
    await transport.verify();
    return {
      success: true,
      message: `Connected, verified TLS certificate, and authenticated with ${cfg.smtpHost}:${cfg.smtpPort} (${cfg.smtpSecurity}). No email was sent.`,
    };
  } catch (err: any) {
    const reason =
      err instanceof EmailCryptoError
        ? err.message
        : err?.message || 'SMTP connection or authentication failed.';
    return { success: false, message: reason };
  } finally {
    if (transport) {
      try {
        transport.close();
      } catch {
        // ignore
      }
    }
  }
}

export async function sendTestEmailUsingConfig(
  cfg: EmailConfig,
  recipientEmail: string
): Promise<{ success: boolean; message: string; messageId?: string; smtpResponse?: string }> {
  if (!cfg.smtpHost || !cfg.fromEmail) {
    return {
      success: false,
      message: 'SMTP host and From email address must be configured before sending a test email.',
    };
  }

  const senderCheck = validateSenderCompatibility({
    fromEmail: cfg.fromEmail,
    smtpUsername: cfg.smtpUsername,
  });
  if (!senderCheck.valid) {
    return { success: false, message: senderCheck.error! };
  }

  let transport: Transporter<SMTPTransport.SentMessageInfo> | null = null;
  try {
    const options = buildSmtpTransportOptions(cfg, false);
    transport = nodemailer.createTransport(options as SMTPTransport.Options);
    const domain = cfg.fromEmail.split('@')[1] || 'global-hrm.net';
    const messageId = `<test-${crypto.randomUUID()}@${domain}>`;

    const info = await transport.sendMail({
      from: `"${cfg.fromDisplayName}" <${cfg.fromEmail}>`,
      to: recipientEmail,
      replyTo: cfg.replyToEmail || undefined,
      messageId,
      subject: `[TEST] ${cfg.fromDisplayName} SMTP Configuration Verification`,
      text: `This is an administrator-initiated test message from ${cfg.fromDisplayName} (${cfg.smtpHost}:${cfg.smtpPort}).\n\nSMTP server acceptance confirms transport handoff only; check the recipient mailbox and DMARC/SPF/DKIM alignment to confirm inbox placement.`,
      html: `<div style="font-family:sans-serif;padding:20px;border:1px solid #d9e6f2;border-radius:8px;max-width:560px;">
        <h2 style="color:#234A7D;margin-top:0;">[TEST] SMTP Configuration Verification</h2>
        <p>This is an administrator-initiated test email sent via <strong>${cfg.smtpHost}:${cfg.smtpPort}</strong> (${cfg.smtpSecurity}).</p>
        <p style="font-size:13px;color:#42526E;">Note: SMTP server acceptance indicates the mail server accepted the message for relay/delivery, not guaranteed inbox placement.</p>
      </div>`,
    });

    return {
      success: true,
      messageId: info.messageId || messageId,
      smtpResponse: info.response,
      message: `SMTP server accepted the test message for ${recipientEmail} (Server response: ${info.response}). Acceptance by SMTP does not guarantee inbox placement.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to send test email.',
    };
  } finally {
    if (transport) {
      try {
        transport.close();
      } catch {
        // ignore
      }
    }
  }
}

export async function testImapConfig(cfg: EmailConfig): Promise<{
  success: boolean;
  message: string;
  folders?: string[];
}> {
  if (!cfg.imapHost) {
    return { success: false, message: 'IMAP hostname is required.' };
  }
  const hostCheck = validateMailHostPolicy(cfg.imapHost, cfg.imapPort, 'imap');
  if (!hostCheck.valid) {
    return { success: false, message: hostCheck.error! };
  }
  if (!cfg.imapUsername || !cfg.imapPasswordEncrypted) {
    return { success: false, message: 'IMAP username and password are required.' };
  }

  let password: string;
  try {
    password = decryptEmailSecret(cfg.imapPasswordEncrypted);
  } catch (err: any) {
    return { success: false, message: err?.message || 'Unable to decrypt IMAP password.' };
  }

  const client = new ImapFlow({
    host: hostCheck.host!,
    port: cfg.imapPort,
    secure: cfg.imapSecurity === 'implicit_tls',
    doSTARTTLS: cfg.imapSecurity === 'starttls',
    auth: {
      user: cfg.imapUsername,
      pass: password,
    },
    logger: false,
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    },
  });

  try {
    await client.connect();
    const list = await client.list();
    const folders = list.map((f) => f.path);
    const lock = await client.getMailboxLock(cfg.imapFolder || 'INBOX', { readOnly: true });
    try {
      // Read-only verification only; no messages modified.
    } finally {
      lock.release();
    }
    return {
      success: true,
      folders,
      message: `Connected, authenticated, and verified read-only access to "${cfg.imapFolder || 'INBOX'}" on ${cfg.imapHost}:${cfg.imapPort}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'IMAP connection, authentication, or folder access failed.',
    };
  } finally {
    try {
      await client.logout();
    } catch {
      // ignore
    }
  }
}

export async function getPublishedEmailTheme(
  activeConfig?: EmailConfig | null
): Promise<EmailThemePalette> {
  const savedTheme = await db.emailThemeConfig.findFirst({
    where: { status: 'published' },
    orderBy: { version: 'desc' },
  });

  let socialLinks: Array<{ label: string; url: string }> = [];
  if (savedTheme?.socialLinksJson) {
    try {
      socialLinks = JSON.parse(savedTheme.socialLinksJson);
    } catch {
      socialLinks = [];
    }
  }

  return {
    logoUrl: savedTheme?.logoPath || DEFAULT_EMAIL_THEME.logoUrl,
    bannerUrl: savedTheme?.bannerPath || DEFAULT_EMAIL_THEME.bannerUrl,
    primaryColor: savedTheme?.primaryColor || DEFAULT_EMAIL_THEME.primaryColor,
    deepBlueColor: savedTheme?.deepBlueColor || DEFAULT_EMAIL_THEME.deepBlueColor,
    orangeAccent: savedTheme?.orangeAccent || DEFAULT_EMAIL_THEME.orangeAccent,
    greenAccent: savedTheme?.greenAccent || DEFAULT_EMAIL_THEME.greenAccent,
    paleBgColor: savedTheme?.paleBgColor || DEFAULT_EMAIL_THEME.paleBgColor,
    bodyTextColor: savedTheme?.bodyTextColor || DEFAULT_EMAIL_THEME.bodyTextColor,
    secondaryTextColor: savedTheme?.secondaryTextColor || DEFAULT_EMAIL_THEME.secondaryTextColor,
    surfaceColor: savedTheme?.surfaceColor || DEFAULT_EMAIL_THEME.surfaceColor,
    senderDisplayName:
      activeConfig?.fromDisplayName ||
      savedTheme?.senderDisplayName ||
      DEFAULT_EMAIL_THEME.senderDisplayName,
    supportEmail:
      activeConfig?.supportEmail ||
      savedTheme?.supportEmail ||
      activeConfig?.fromEmail ||
      DEFAULT_EMAIL_THEME.supportEmail,
    websiteUrl:
      activeConfig?.websiteUrl ||
      savedTheme?.websiteUrl ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      DEFAULT_EMAIL_THEME.websiteUrl,
    tagline: savedTheme?.tagline || DEFAULT_EMAIL_THEME.tagline,
    footerTagline: savedTheme?.footerTagline || DEFAULT_EMAIL_THEME.footerTagline,
    socialLinks,
  };
}

export async function resolveTemplateForType(emailType: ManagedEmailType) {
  const saved = await db.emailTemplate.findUnique({ where: { emailType } });
  const def = DEFAULT_EMAIL_TEMPLATES[emailType];

  if (saved) {
    if (saved.status === 'published') {
      return {
        published: true as const,
        version: saved.version,
        requiredPlaceholders: def.requiredPlaceholders,
        template: {
          variant: (saved.variant as 'transactional' | 'community') || def.variant,
          subject: saved.subject,
          preheader: saved.preheader || def.preheader,
          eyebrow: saved.eyebrow,
          heading: saved.heading,
          greeting: saved.greeting || def.greeting,
          bodyHtml: saved.bodyHtml,
          bodyText: saved.bodyText,
          infoPanelTitle: saved.infoPanelTitle,
          infoPanelBody: saved.infoPanelBody,
          footerText: saved.footerText,
          ctaLabel: saved.ctaLabel || def.ctaLabel,
          ctaUrlTemplate: saved.ctaUrlTemplate || def.ctaUrlTemplate,
          bannerKey: saved.bannerKey,
          securityOrHelpNote: def.securityOrHelpNote,
          unsubscribeLabel: def.unsubscribeLabel,
        },
      };
    }

    // Saved row is a draft: fall back to latest published version snapshot if one exists
    const lastPublished = await db.emailTemplateVersion.findFirst({
      where: { emailType, status: 'published' },
      orderBy: { version: 'desc' },
    });
    if (lastPublished) {
      const snap = JSON.parse(lastPublished.snapshotJson);
      return {
        published: true as const,
        version: lastPublished.version,
        requiredPlaceholders: def.requiredPlaceholders,
        template: {
          variant: def.variant,
          subject: snap.subject || def.subject,
          preheader: snap.preheader || def.preheader,
          eyebrow: snap.eyebrow ?? def.eyebrow,
          heading: snap.heading || def.heading,
          greeting: snap.greeting || def.greeting,
          bodyHtml: snap.bodyHtml || def.bodyHtml,
          bodyText: snap.bodyText || def.bodyText,
          infoPanelTitle: snap.infoPanelTitle ?? def.infoPanelTitle,
          infoPanelBody: snap.infoPanelBody ?? def.infoPanelBody,
          footerText: snap.footerText || def.footerText,
          ctaLabel: snap.ctaLabel || def.ctaLabel,
          ctaUrlTemplate: snap.ctaUrlTemplate || def.ctaUrlTemplate,
          bannerKey: snap.bannerKey ?? def.bannerKey ?? null,
          securityOrHelpNote: def.securityOrHelpNote,
          unsubscribeLabel: def.unsubscribeLabel,
        },
      };
    }
  }

  if (def.defaultStatus !== 'published') {
    return {
      published: false as const,
      version: 1,
      requiredPlaceholders: def.requiredPlaceholders,
    };
  }

  return {
    published: true as const,
    version: 1,
    requiredPlaceholders: def.requiredPlaceholders,
    template: {
      variant: def.variant,
      subject: def.subject,
      preheader: def.preheader,
      eyebrow: def.eyebrow,
      heading: def.heading,
      greeting: def.greeting,
      bodyHtml: def.bodyHtml,
      bodyText: def.bodyText,
      infoPanelTitle: def.infoPanelTitle,
      infoPanelBody: def.infoPanelBody,
      footerText: def.footerText,
      ctaLabel: def.ctaLabel,
      ctaUrlTemplate: def.ctaUrlTemplate,
      bannerKey: def.bannerKey || null,
      securityOrHelpNote: def.securityOrHelpNote,
      unsubscribeLabel: def.unsubscribeLabel,
    },
  };
}

export interface EnqueueEmailParams {
  businessKey: string;
  emailType: ManagedEmailType;
  recipientEmail: string;
  recipientName?: string | null;
  templateData: Record<string, string>;
  campaignId?: string | null;
  participantId?: string | null;
  containsSensitiveLink?: boolean;
  payloadExpiresAt?: Date | null;
  bypassSuppressionCheck?: boolean;
  sendImmediately?: boolean;
}

export async function enqueueAndSendEmail(params: EnqueueEmailParams): Promise<{
  success: boolean;
  outboxId?: string;
  status: string;
  message: string;
}> {
  const normalizedRecipient = normalizeEmail(params.recipientEmail);
  const activeConfig = await getActiveEmailConfig();

  // Check duplicate businessKey first (idempotency)
  const existing = await db.emailOutbox.findUnique({
    where: { businessKey: params.businessKey },
  });
  if (existing) {
    return {
      success: existing.status === 'accepted_by_smtp' || existing.status === 'delivered',
      outboxId: existing.id,
      status: existing.status,
      message: `Email already queued/processed (${existing.status}).`,
    };
  }

  // Respect EmailSuppression unless explicitly bypassed (e.g. direct admin alert)
  if (!params.bypassSuppressionCheck) {
    const suppressed = await db.emailSuppression.findUnique({
      where: { normalizedEmail: normalizedRecipient },
    });
    if (suppressed) {
      const suppressedRecord = await db.emailOutbox.create({
        data: {
          businessKey: params.businessKey,
          emailType: params.emailType,
          campaignId: params.campaignId || null,
          participantId: params.participantId || null,
          recipientEmail: params.recipientEmail.trim(),
          normalizedRecipient,
          recipientName: params.recipientName || null,
          fromAddress: activeConfig?.fromEmail || 'unconfigured',
          subject: `[Suppressed] ${params.emailType}`,
          status: 'suppressed',
          lastError: `Recipient suppressed (${suppressed.reason}).`,
        },
      });
      return {
        success: false,
        outboxId: suppressedRecord.id,
        status: 'suppressed',
        message: 'Recipient email address is suppressed and was not sent.',
      };
    }
  }

  // Resolve sender identity & optional per-type override
  let fromDisplayName = activeConfig?.fromDisplayName || 'Global HRM Network';
  let fromEmail = activeConfig?.fromEmail || '';
  let replyToEmail = activeConfig?.replyToEmail || '';

  if (activeConfig?.senderOverridesJson) {
    try {
      const overrides = JSON.parse(activeConfig.senderOverridesJson) as Record<string, SenderOverride>;
      const ov = overrides[params.emailType];
      if (ov) {
        if (ov.fromDisplayName?.trim()) fromDisplayName = ov.fromDisplayName.trim();
        if (ov.fromEmail?.trim()) fromEmail = ov.fromEmail.trim();
        if (ov.replyToEmail?.trim()) replyToEmail = ov.replyToEmail.trim();
      }
    } catch {
      // ignore malformed override json
    }
  }

  const resolved = await resolveTemplateForType(params.emailType);
  if (!resolved.published) {
    return {
      success: false,
      status: 'permanently_failed',
      message: `Template "${params.emailType}" is currently an unpublished draft and cannot be sent.`,
    };
  }

  const theme = await getPublishedEmailTheme(activeConfig);
  const normalizedVars = normalizeRuntimeVariables({
    preferred_name: params.recipientName?.trim() || '',
    support_email: theme.supportEmail,
    website_url: theme.websiteUrl,
    ...params.templateData,
  });

  const varCheck = validateRequiredRuntimeVariables(resolved.requiredPlaceholders, normalizedVars);
  if (!varCheck.valid) {
    return {
      success: false,
      status: 'permanently_failed',
      message: `Missing required email template variables: ${varCheck.missing.join(', ')}`,
    };
  }

  const rendered = renderBrandedEmail({
    template: resolved.template,
    variables: normalizedVars,
    theme,
  });

  if (!activeConfig || !activeConfig.smtpEnabled || !fromEmail) {
    const failedRow = await db.emailOutbox.create({
      data: {
        businessKey: params.businessKey,
        emailType: params.emailType,
        campaignId: params.campaignId || null,
        participantId: params.participantId || null,
        recipientEmail: params.recipientEmail.trim(),
        normalizedRecipient,
        recipientName: params.recipientName || null,
        fromAddress: fromEmail || 'unconfigured',
        replyToAddress: replyToEmail || null,
        subject: rendered.subject,
        status: 'permanently_failed',
        lastError: !activeConfig
          ? 'No active email configuration is activated.'
          : !activeConfig.smtpEnabled
            ? 'Outgoing email is currently disabled in Email Settings.'
            : 'Sender From address is not configured.',
      },
    });
    return {
      success: false,
      outboxId: failedRow.id,
      status: 'permanently_failed',
      message: failedRow.lastError!,
    };
  }

  const domain = fromEmail.split('@')[1] || 'global-hrm.net';
  const messageId = `<${crypto.randomUUID()}@${domain}>`;

  const outboxRow = await db.emailOutbox.create({
    data: {
      businessKey: params.businessKey,
      emailType: params.emailType,
      templateVersion: resolved.version,
      campaignId: params.campaignId || null,
      participantId: params.participantId || null,
      recipientEmail: params.recipientEmail.trim(),
      normalizedRecipient,
      recipientName: params.recipientName || null,
      fromAddress: `"${fromDisplayName}" <${fromEmail}>`,
      replyToAddress: replyToEmail || null,
      subject: rendered.subject,
      htmlBody: rendered.html,
      textBody: rendered.text,
      containsSensitiveLink: Boolean(params.containsSensitiveLink),
      payloadExpiresAt: params.payloadExpiresAt || null,
      status: 'queued',
      maxAttempts: Math.max(1, (activeConfig.smtpMaxRetries ?? 3) + 1),
      messageId,
    },
  });

  if (params.sendImmediately !== false) {
    const dispatchResult = await deliverSingleOutboxRow(outboxRow.id, activeConfig);
    return dispatchResult;
  }

  return {
    success: true,
    outboxId: outboxRow.id,
    status: 'queued',
    message: 'Email queued for delivery.',
  };
}

function isTransientSmtpError(err: any): boolean {
  const code = String(err?.code || '');
  const responseCode = Number(err?.responseCode || 0);
  if (responseCode >= 400 && responseCode < 500) return true;
  if (
    ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ESOCKET'].includes(code)
  ) {
    return true;
  }
  return false;
}

async function deliverSingleOutboxRow(
  outboxId: string,
  activeConfig: EmailConfig
): Promise<{ success: boolean; outboxId: string; status: string; message: string }> {
  const workerId = `worker-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date();
  const staleLeaseCutoff = new Date(now.getTime() - 5 * 60_000);

  // Atomic lease claim
  const claimed = await db.emailOutbox.updateMany({
    where: {
      id: outboxId,
      status: { in: ['queued', 'temporarily_failed'] },
      nextAttemptAt: { lte: now },
      OR: [{ lockedAt: null }, { lockedAt: { lt: staleLeaseCutoff } }],
    },
    data: {
      status: 'processing',
      lockedAt: now,
      lockedBy: workerId,
    },
  });

  if (claimed.count === 0) {
    const current = await db.emailOutbox.findUnique({ where: { id: outboxId } });
    return {
      success: current?.status === 'accepted_by_smtp' || current?.status === 'delivered',
      outboxId,
      status: current?.status || 'unknown',
      message: 'Message is already claimed or processed.',
    };
  }

  const row = await db.emailOutbox.findUnique({ where: { id: outboxId } });
  if (!row) {
    return { success: false, outboxId, status: 'permanently_failed', message: 'Outbox row missing.' };
  }

  // Enforce rate limit per minute
  const oneMinAgo = new Date(Date.now() - 60_000);
  const recentSentCount = await db.emailOutbox.count({
    where: {
      status: { in: ['accepted_by_smtp', 'delivered'] },
      sentAt: { gte: oneMinAgo },
    },
  });

  if (recentSentCount >= activeConfig.smtpRateLimitPerMinute) {
    await db.emailOutbox.update({
      where: { id: row.id },
      data: {
        status: 'queued',
        lockedAt: null,
        lockedBy: null,
        nextAttemptAt: new Date(Date.now() + 30_000),
      },
    });
    return {
      success: false,
      outboxId: row.id,
      status: 'queued',
      message: 'Rate limit reached; rescheduled for next worker cycle.',
    };
  }

  try {
    const transporter = getPooledSmtpTransporter(activeConfig);
    const info = await transporter.sendMail({
      from: row.fromAddress,
      to: row.recipientEmail,
      replyTo: row.replyToAddress || undefined,
      messageId: row.messageId || undefined,
      subject: row.subject,
      html: row.htmlBody || undefined,
      text: row.textBody || undefined,
    });

    await db.emailOutbox.update({
      where: { id: row.id },
      data: {
        status: 'accepted_by_smtp',
        attemptCount: row.attemptCount + 1,
        sentAt: new Date(),
        smtpResponse: info.response || '250 OK',
        lastError: null,
        lockedAt: null,
        lockedBy: null,
        // Redact sensitive link payloads immediately after SMTP acceptance
        ...(row.containsSensitiveLink ? { htmlBody: null, textBody: null } : {}),
      },
    });

    return {
      success: true,
      outboxId: row.id,
      status: 'accepted_by_smtp',
      message: `Accepted by SMTP server (${info.response || '250 OK'}).`,
    };
  } catch (err: any) {
    const nextAttempt = row.attemptCount + 1;
    const transient = isTransientSmtpError(err);
    const exhausted = !transient || nextAttempt >= row.maxAttempts;
    const backoffSeconds = Math.min(3600, Math.pow(2, nextAttempt) * 30);

    await db.emailOutbox.update({
      where: { id: row.id },
      data: {
        status: exhausted ? 'permanently_failed' : 'temporarily_failed',
        attemptCount: nextAttempt,
        lastError: err?.message || 'SMTP delivery attempt failed.',
        nextAttemptAt: exhausted ? row.nextAttemptAt : new Date(Date.now() + backoffSeconds * 1000),
        lockedAt: null,
        lockedBy: null,
        ...(exhausted && row.containsSensitiveLink ? { htmlBody: null, textBody: null } : {}),
      },
    });

    return {
      success: false,
      outboxId: row.id,
      status: exhausted ? 'permanently_failed' : 'temporarily_failed',
      message: err?.message || 'SMTP send failed.',
    };
  }
}

export async function processEmailOutboxBatch(limit: number = 25): Promise<{
  processed: number;
  accepted: number;
  failed: number;
  cleanedUpExpired: number;
}> {
  // Scrub expired sensitive payloads regardless of send status
  const cleanup = await db.emailOutbox.updateMany({
    where: {
      containsSensitiveLink: true,
      payloadExpiresAt: { lt: new Date() },
      OR: [{ htmlBody: { not: null } }, { textBody: { not: null } }],
    },
    data: {
      htmlBody: null,
      textBody: null,
    },
  });

  const activeConfig = await getActiveEmailConfig();
  if (!activeConfig || !activeConfig.smtpEnabled) {
    return { processed: 0, accepted: 0, failed: 0, cleanedUpExpired: cleanup.count };
  }

  const now = new Date();
  const staleLeaseCutoff = new Date(now.getTime() - 5 * 60_000);
  const due = await db.emailOutbox.findMany({
    where: {
      status: { in: ['queued', 'temporarily_failed'] },
      nextAttemptAt: { lte: now },
      OR: [{ lockedAt: null }, { lockedAt: { lt: staleLeaseCutoff } }],
    },
    orderBy: { nextAttemptAt: 'asc' },
    take: limit,
    select: { id: true },
  });

  let accepted = 0;
  let failed = 0;
  for (const item of due) {
    const res = await deliverSingleOutboxRow(item.id, activeConfig);
    if (res.success) accepted++;
    else failed++;
  }

  return {
    processed: due.length,
    accepted,
    failed,
    cleanedUpExpired: cleanup.count,
  };
}

export async function pollImapInbox(): Promise<{
  skipped?: boolean;
  reason?: string;
  imported: number;
  correlated: number;
}> {
  const activeConfig = await getActiveEmailConfig();
  if (!activeConfig || !activeConfig.imapEnabled) {
    return { skipped: true, reason: 'Incoming IMAP is disabled.', imported: 0, correlated: 0 };
  }
  if (!activeConfig.imapHost || !activeConfig.imapUsername || !activeConfig.imapPasswordEncrypted) {
    return { skipped: true, reason: 'IMAP settings are incomplete.', imported: 0, correlated: 0 };
  }

  const hostCheck = validateMailHostPolicy(activeConfig.imapHost, activeConfig.imapPort, 'imap');
  if (!hostCheck.valid) {
    return { skipped: true, reason: hostCheck.error, imported: 0, correlated: 0 };
  }

  const folder = activeConfig.imapFolder || 'INBOX';
  const mailboxKey = `${activeConfig.imapHost}:${activeConfig.imapPort}:${activeConfig.imapUsername}`;
  let password: string;
  try {
    password = decryptEmailSecret(activeConfig.imapPasswordEncrypted);
  } catch (err: any) {
    return { skipped: true, reason: err?.message, imported: 0, correlated: 0 };
  }

  const client = new ImapFlow({
    host: hostCheck.host!,
    port: activeConfig.imapPort,
    secure: activeConfig.imapSecurity === 'implicit_tls',
    doSTARTTLS: activeConfig.imapSecurity === 'starttls',
    auth: {
      user: activeConfig.imapUsername,
      pass: password,
    },
    logger: false,
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    },
  });

  let imported = 0;
  let correlated = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder, { readOnly: true });

    try {
      const mailboxStatus = client.mailbox;
      const uidValidity = mailboxStatus && typeof mailboxStatus === 'object' ? BigInt(mailboxStatus.uidValidity) : BigInt(0);

      let cursor = await db.imapMailboxCursor.findUnique({ where: { mailboxKey } });
      if (!cursor) {
        cursor = await db.imapMailboxCursor.create({
          data: {
            mailboxKey,
            folder,
            uidValidity,
            lastProcessedUid: 0,
          },
        });
      }

      let startUid = cursor.lastProcessedUid + 1;
      if (cursor.uidValidity !== uidValidity || cursor.folder !== folder) {
        // UIDVALIDITY changed or folder switched: reset UID cursor safely
        startUid = 1;
      }

      // Compute bounded date threshold for initial sync
      const now = new Date();
      let sinceDate = activeConfig.imapActivatedAt || now;
      if (cursor.lastProcessedUid === 0) {
        if (activeConfig.imapInitialSyncMode === 'last_7_days') {
          sinceDate = new Date(now.getTime() - 7 * 86_400_000);
        } else if (activeConfig.imapInitialSyncMode === 'last_30_days') {
          sinceDate = new Date(now.getTime() - 30 * 86_400_000);
        }
      }

      const searchCriteria: any =
        cursor.lastProcessedUid > 0 && cursor.uidValidity === uidValidity
          ? { uid: `${startUid}:*` }
          : { since: sinceDate };

      const uids = await client.search(searchCriteria, { uid: true });
      const boundedUids = Array.isArray(uids) ? uids.filter((u) => u >= startUid).slice(0, 50) : [];

      let highestUid = cursor.lastProcessedUid;
      const MAX_SOURCE_BYTES = 2 * 1024 * 1024; // 2 MB limit

      for await (const msg of client.fetch(boundedUids, {
        uid: true,
        envelope: true,
        size: true,
        internalDate: true,
        source: true,
      }, { uid: true })) {
        if (msg.uid > highestUid) highestUid = msg.uid;

        const sizeBytes = msg.size || 0;
        if (sizeBytes > MAX_SOURCE_BYTES || !msg.source) {
          await db.inboundEmailMessage.upsert({
            where: {
              mailboxKey_folder_uidValidity_uid: {
                mailboxKey,
                folder,
                uidValidity,
                uid: msg.uid,
              },
            },
            update: {},
            create: {
              mailboxKey,
              folder,
              uidValidity,
              uid: msg.uid,
              fromAddress: msg.envelope?.from?.[0]?.address || null,
              fromName: msg.envelope?.from?.[0]?.name || null,
              toAddress: msg.envelope?.to?.[0]?.address || null,
              subject: msg.envelope?.subject || '(No subject)',
              receivedAt: msg.internalDate ? new Date(msg.internalDate) : new Date(),
              processingStatus: 'ignored',
              textPreview: 'Message exceeded 2 MB processing limit and body was not parsed.',
              sizeBytes,
            },
          });
          imported++;
          continue;
        }

        const parsed = await simpleParser(msg.source);
        const msgId = parsed.messageId || msg.envelope?.messageId || null;
        const inReplyTo = parsed.inReplyTo || null;
        const refs = Array.isArray(parsed.references)
          ? parsed.references.join(' ')
          : parsed.references || null;

        const attachmentMeta = (parsed.attachments || []).map((att) => ({
          filename: att.filename || 'attachment',
          contentType: att.contentType,
          size: att.size,
        }));

        const textPreview = buildSafeTextPreview(
          parsed.text,
          typeof parsed.html === 'string' ? parsed.html : null
        );
        const sanitizedHtml =
          typeof parsed.html === 'string' ? sanitizeInboundHtml(parsed.html) : null;

        // Correlate with outgoing EmailOutbox via In-Reply-To or References
        const candidateIds = [
          inReplyTo,
          ...(refs ? refs.split(/\s+/) : []),
        ].filter((v): v is string => Boolean(v && v.trim()));

        let relatedOutbox = candidateIds.length
          ? await db.emailOutbox.findFirst({
              where: { messageId: { in: candidateIds } },
            })
          : null;

        let processingStatus = relatedOutbox ? 'correlated' : 'received';

        // Check for DSN bounce correlation only against an actual outbox message
        if (relatedOutbox && parsed.text && /Original-Message-ID|Action:\s*failed/i.test(parsed.text)) {
          processingStatus = 'dsn_bounce_correlated';
          await db.emailOutbox.update({
            where: { id: relatedOutbox.id },
            data: { status: 'bounced', lastError: 'DSN bounce correlated from inbound mail.' },
          });
        }

        if (relatedOutbox) correlated++;

        await db.inboundEmailMessage.upsert({
          where: {
            mailboxKey_folder_uidValidity_uid: {
              mailboxKey,
              folder,
              uidValidity,
              uid: msg.uid,
            },
          },
          update: {},
          create: {
            mailboxKey,
            folder,
            uidValidity,
            uid: msg.uid,
            messageId: msgId,
            inReplyTo,
            referencesHeader: refs,
            fromAddress: parsed.from?.value?.[0]?.address || msg.envelope?.from?.[0]?.address || null,
            fromName: parsed.from?.value?.[0]?.name || msg.envelope?.from?.[0]?.name || null,
            toAddress: parsed.to && !Array.isArray(parsed.to)
              ? parsed.to.value?.[0]?.address || null
              : msg.envelope?.to?.[0]?.address || null,
            subject: parsed.subject || msg.envelope?.subject || '(No subject)',
            receivedAt: parsed.date || (msg.internalDate ? new Date(msg.internalDate) : new Date()),
            processingStatus,
            textPreview,
            sanitizedHtml,
            attachmentMetadataJson: attachmentMeta.length ? JSON.stringify(attachmentMeta) : null,
            sizeBytes,
            relatedOutboxId: relatedOutbox?.id || null,
            relatedParticipantId: relatedOutbox?.participantId || null,
          },
        });
        imported++;
      }

      await db.imapMailboxCursor.update({
        where: { mailboxKey },
        data: {
          folder,
          uidValidity,
          lastProcessedUid: highestUid,
          lastPolledAt: new Date(),
          lastError: null,
        },
      });

      // Enforce inbound retention cleanup
      const retentionCutoff = new Date(
        Date.now() - (activeConfig.imapRetentionDays || 90) * 86_400_000
      );
      await db.inboundEmailMessage.deleteMany({
        where: { createdAt: { lt: retentionCutoff } },
      });
    } finally {
      lock.release();
    }

    return { imported, correlated };
  } catch (err: any) {
    await db.imapMailboxCursor.upsert({
      where: { mailboxKey },
      update: { lastPolledAt: new Date(), lastError: err?.message || 'IMAP poll error' },
      create: { mailboxKey, folder, lastPolledAt: new Date(), lastError: err?.message || 'IMAP poll error' },
    });
    return { skipped: false, reason: err?.message, imported, correlated };
  } finally {
    try {
      await client.logout();
    } catch {
      // ignore
    }
  }
}
