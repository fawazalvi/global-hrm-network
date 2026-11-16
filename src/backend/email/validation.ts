import net from 'net';
import { z } from 'zod';

const METADATA_IPS = new Set([
  '169.254.169.254',
  '169.254.170.2',
  '100.100.100.200',
  'fd00:ec2::254',
]);

const METADATA_HOSTS = new Set([
  'metadata.google.internal',
  'metadata',
  'instance-data',
]);

const DEFAULT_ALLOWED_MAIL_PORTS = new Set([25, 465, 587, 2525, 143, 993]);

function isPrivateOrLoopbackIp(ip: string): { isPrivate: boolean; isLoopback: boolean } {
  const version = net.isIP(ip);
  if (version === 4) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    const isLoopback = a === 127;
    const isLinkLocal = a === 169 && b === 254;
    const isPrivate =
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 0 ||
      isLinkLocal;
    return { isPrivate, isLoopback };
  }
  if (version === 6) {
    const normalized = ip.toLowerCase();
    const isLoopback = normalized === '::1' || normalized === '0:0:0:0:0:0:0:1';
    const isPrivate =
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80:') ||
      normalized === '::';
    return { isPrivate, isLoopback };
  }
  return { isPrivate: false, isLoopback: false };
}

export function getAllowedMailPorts(): Set<number> {
  const extra = process.env.EMAIL_ALLOWED_PORTS;
  if (!extra || !extra.trim()) return DEFAULT_ALLOWED_MAIL_PORTS;
  const set = new Set(DEFAULT_ALLOWED_MAIL_PORTS);
  for (const part of extra.split(',')) {
    const num = Number(part.trim());
    if (Number.isInteger(num) && num >= 1 && num <= 65535) {
      set.add(num);
    }
  }
  return set;
}

export function validateMailHostPolicy(
  rawHost: string,
  port: number,
  protocol: 'smtp' | 'imap'
): { valid: boolean; error?: string; host?: string } {
  const host = rawHost.trim().toLowerCase();
  if (!host) {
    return { valid: false, error: `${protocol.toUpperCase()} hostname is required.` };
  }

  if (host.includes('://') || host.includes('/') || host.includes('@') || /\s/.test(host)) {
    return {
      valid: false,
      error: `${protocol.toUpperCase()} hostname must be a plain hostname or IP address without protocol or path.`,
    };
  }

  if (METADATA_HOSTS.has(host) || METADATA_IPS.has(host)) {
    return {
      valid: false,
      error: `${protocol.toUpperCase()} hostname is blocked by server security policy.`,
    };
  }

  const allowedPorts = getAllowedMailPorts();
  if (!Number.isInteger(port) || !allowedPorts.has(port)) {
    return {
      valid: false,
      error: `${protocol.toUpperCase()} port ${port} is not in the allowed mail port policy (${Array.from(allowedPorts).join(', ')}).`,
    };
  }

  const allowPrivate = process.env.EMAIL_ALLOW_PRIVATE_MAIL_HOSTS === 'true';
  const allowLocalDev =
    process.env.NODE_ENV !== 'production' && process.env.EMAIL_ALLOW_LOCAL_DEV_MAIL === 'true';
  const explicitAllowlist = new Set(
    (process.env.EMAIL_ALLOWED_MAIL_HOSTS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );

  const ipVersion = net.isIP(host);
  if (ipVersion !== 0) {
    const { isPrivate, isLoopback } = isPrivateOrLoopbackIp(host);
    if (isLoopback && !allowLocalDev && !explicitAllowlist.has(host)) {
      return {
        valid: false,
        error: `Loopback ${protocol.toUpperCase()} host (${host}) is only permitted in local development with EMAIL_ALLOW_LOCAL_DEV_MAIL=true.`,
      };
    }
    if (isPrivate && !allowPrivate && !explicitAllowlist.has(host)) {
      return {
        valid: false,
        error: `Private network ${protocol.toUpperCase()} IP (${host}) requires explicit server policy (EMAIL_ALLOW_PRIVATE_MAIL_HOSTS=true or EMAIL_ALLOWED_MAIL_HOSTS).`,
      };
    }
    return { valid: true, host };
  }

  // Hostname validation
  if (!/^[a-z0-9.-]+$/.test(host) || host.startsWith('.') || host.endsWith('.')) {
    return { valid: false, error: `Invalid ${protocol.toUpperCase()} hostname format.` };
  }

  const isLocalhost = host === 'localhost' || host.endsWith('.localhost');
  if (isLocalhost && !allowLocalDev && !explicitAllowlist.has(host)) {
    return {
      valid: false,
      error: `Localhost ${protocol.toUpperCase()} host is only permitted in local development with EMAIL_ALLOW_LOCAL_DEV_MAIL=true.`,
    };
  }

  // Single-label internal container hostname (e.g., "stalwart")
  if (!host.includes('.') && !allowPrivate && !allowLocalDev && !explicitAllowlist.has(host)) {
    return {
      valid: false,
      error: `Internal container hostname "${host}" requires EMAIL_ALLOW_PRIVATE_MAIL_HOSTS=true (and matching TLS certificate SAN if using TLS).`,
    };
  }

  return { valid: true, host };
}

export function isUnencryptedSmtpAllowed(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.EMAIL_ALLOW_UNENCRYPTED_SMTP === 'true'
  );
}

export function validateSenderCompatibility(params: {
  fromEmail: string;
  smtpUsername?: string | null;
}): { valid: boolean; error?: string } {
  const fromEmail = params.fromEmail.trim().toLowerCase();
  const fromDomain = fromEmail.split('@')[1];
  if (!fromDomain) {
    return { valid: false, error: 'From email address must include a valid domain.' };
  }

  const allowedDomainsEnv = process.env.EMAIL_ALLOWED_SENDER_DOMAINS;
  if (allowedDomainsEnv && allowedDomainsEnv.trim()) {
    const allowed = new Set(
      allowedDomainsEnv
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean)
    );
    if (!allowed.has(fromDomain)) {
      return {
        valid: false,
        error: `Sender domain "${fromDomain}" is not in EMAIL_ALLOWED_SENDER_DOMAINS (${Array.from(allowed).join(', ')}).`,
      };
    }
  } else if (params.smtpUsername && params.smtpUsername.includes('@')) {
    const authDomain = params.smtpUsername.trim().toLowerCase().split('@')[1];
    if (authDomain && authDomain !== fromDomain && !fromDomain.endsWith(`.${authDomain}`)) {
      return {
        valid: false,
        error: `Sender domain "${fromDomain}" does not match the authenticated SMTP mailbox domain "${authDomain}". Configure EMAIL_ALLOWED_SENDER_DOMAINS if Stalwart authorizes cross-domain sending.`,
      };
    }
  }

  return { valid: true };
}

export const SecretActionEnum = z.enum(['keep', 'replace', 'remove']);

export const SenderOverrideItemSchema = z.object({
  fromDisplayName: z.string().trim().max(120).optional().or(z.literal('')),
  fromEmail: z.string().trim().email().optional().or(z.literal('')),
  replyToEmail: z.string().trim().email().optional().or(z.literal('')),
});

export const EmailDraftSaveSchema = z.object({
  // Outgoing SMTP
  smtpEnabled: z.boolean(),
  smtpHost: z.string().trim().max(255).optional().nullable(),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(587),
  smtpSecurity: z.enum(['implicit_tls', 'starttls', 'none_dev_only']).default('starttls'),
  smtpAuthEnabled: z.boolean().default(true),
  smtpUsername: z.string().trim().max(255).optional().nullable(),
  smtpPassword: z.string().max(500).optional(),
  smtpPasswordAction: SecretActionEnum.default('keep'),
  smtpConnectionTimeoutMs: z.coerce.number().int().min(1000).max(60000).default(10000),
  smtpRateLimitPerMinute: z.coerce.number().int().min(1).max(600).default(30),
  smtpMaxRetries: z.coerce.number().int().min(0).max(10).default(3),

  // Sender identity
  fromDisplayName: z.string().trim().min(1).max(120).default('Global HRM Network'),
  fromEmail: z.string().trim().email().optional().nullable().or(z.literal('')),
  replyToEmail: z.string().trim().email().optional().nullable().or(z.literal('')),
  supportEmail: z.string().trim().email().optional().nullable().or(z.literal('')),
  footerText: z.string().trim().max(1000).optional().nullable(),
  websiteUrl: z.string().trim().url().optional().nullable().or(z.literal('')),
  senderOverrides: z.record(z.string(), SenderOverrideItemSchema).optional(),

  // Incoming IMAP
  imapEnabled: z.boolean().default(false),
  imapHost: z.string().trim().max(255).optional().nullable(),
  imapPort: z.coerce.number().int().min(1).max(65535).default(993),
  imapSecurity: z.enum(['implicit_tls', 'starttls']).default('implicit_tls'),
  imapUsername: z.string().trim().max(255).optional().nullable(),
  imapPassword: z.string().max(500).optional(),
  imapPasswordAction: SecretActionEnum.default('keep'),
  imapFolder: z.string().trim().min(1).max(120).default('INBOX'),
  imapPollingIntervalSec: z.coerce.number().int().min(30).max(3600).default(120),
  imapInitialSyncMode: z.enum(['after_activation', 'last_7_days', 'last_30_days']).default('after_activation'),
  imapRetentionDays: z.coerce.number().int().min(1).max(3650).default(90),
});

export const SendTestEmailSchema = z.object({
  recipientEmail: z.string().trim().email('Please enter a valid recipient email address.'),
});

export const EmailTemplateUpdateSchema = z.object({
  emailType: z.string().trim().min(1),
  subject: z.string().trim().min(1).max(300),
  heading: z.string().trim().min(1).max(200),
  bodyHtml: z.string().trim().min(1).max(20000),
  bodyText: z.string().trim().min(1).max(20000),
  footerText: z.string().trim().max(1000),
  ctaLabel: z.string().trim().max(100).optional().nullable(),
});
