import fs from 'fs/promises';
import path from 'path';
import { sendEmail } from '@/backend/ai/flows/send-email';

interface ServiceAccountCreds {
  client_email: string;
  private_key: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadGmailServiceAccount(): Promise<ServiceAccountCreds | null> {
  const envKey = process.env.GMAIL_SERVICE_ACCOUNT_KEY;
  if (envKey && envKey.trim()) {
    try {
      const parsed = JSON.parse(envKey);
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
        };
      }
    } catch {
      console.error('Invalid GMAIL_SERVICE_ACCOUNT_KEY JSON configuration.');
    }
  }

  if (process.env.GMAIL_CLIENT_EMAIL && process.env.GMAIL_PRIVATE_KEY) {
    return {
      client_email: process.env.GMAIL_CLIENT_EMAIL,
      private_key: process.env.GMAIL_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  try {
    const keyFilePath = path.join(process.cwd(), 'gmail.json');
    const content = await fs.readFile(keyFilePath, 'utf8');
    const parsed = JSON.parse(content);
    if (parsed.client_email && parsed.private_key) {
      return {
        client_email: parsed.client_email,
        private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
      };
    }
  } catch {
    // No local gmail.json available
  }

  return null;
}

export function resolveSiteOrigin(req?: Request): string {
  const envUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (req) {
    const forwardedHost = req.headers.get('x-forwarded-host');
    const host = forwardedHost || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    if (host) {
      return `${proto}://${host}`;
    }
  }
  if (envUrl && envUrl.trim()) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'http://localhost:3000';
}

export interface SendReferralInvitationEmailParams {
  toEmail: string;
  colleaguePreferredName?: string | null;
  referrerPreferredName: string;
  referralUrl: string;
}

export async function sendReferralInvitationEmail(
  params: SendReferralInvitationEmailParams
): Promise<{ success: boolean; message: string }> {
  const creds = await loadGmailServiceAccount();
  if (!creds) {
    return {
      success: false,
      message: 'Email service credentials are not configured on this server.',
    };
  }

  const fromEmail = process.env.GMAIL_IMPERSONATED_USER_EMAIL || 'memberships@global-hrm.net';
  const greetingName = params.colleaguePreferredName?.trim()
    ? escapeHtml(params.colleaguePreferredName.trim())
    : 'there';
  const referrerSafe = escapeHtml(params.referrerPreferredName.trim());
  const urlSafe = escapeHtml(params.referralUrl);

  const subject = `${params.referrerPreferredName.trim()} invites you to the Pakistan Banking Expertise Map`;

  const body = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #F8FBFF; margin: 0; padding: 24px; color: #1F2937; }
    .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #D9E6F2; border-radius: 12px; padding: 32px; }
    .brand { font-size: 14px; font-weight: 700; color: #0F57D0; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 16px; }
    h2 { color: #234A7D; margin-top: 0; font-size: 20px; }
    p { line-height: 1.6; color: #42526E; font-size: 15px; }
    .cta { display: inline-block; margin: 20px 0; background-color: #0F57D0; color: #FFFFFF !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; }
    .link-fallback { font-size: 12px; color: #42526E; word-break: break-all; background: #F8FBFF; padding: 10px 12px; border-radius: 6px; border: 1px solid #D9E6F2; }
    .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #D9E6F2; font-size: 12px; color: #6B7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">Global HRM Network</div>
    <h2>Invitation: Pakistan Banking Expertise Map</h2>
    <p>Hello ${greetingName},</p>
    <p><strong>${referrerSafe}</strong> has invited you to participate in Global HRM Network&rsquo;s <strong>Pakistan Banking Expertise Map</strong>.</p>
    <p>This initiative brings together basic professional profiles and high-level expertise from banking professionals across Pakistan to map industry capabilities and strategic priorities. Contributing your profile takes approximately 3 minutes.</p>
    <p>
      <a href="${urlSafe}" class="cta">Participate in the Survey</a>
    </p>
    <p>Participation is completely voluntary, and you may also choose whether or not to associate your response with this invitation.</p>
    <div class="link-fallback">
      If the button above does not work, copy and paste this link into your browser:<br />
      ${urlSafe}
    </div>
    <div class="footer">
      Sent by Global HRM Network (${escapeHtml(fromEmail)}). Please do not reply if you do not wish to participate.
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: params.toEmail,
    from: fromEmail,
    subject,
    body,
    clientEmail: creds.client_email,
    privateKey: creds.private_key,
  });
}
