import { enqueueAndSendEmail } from '@/backend/email/service';

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
  campaignId?: string | null;
  campaignTitle?: string;
  invitationId?: string;
  origin?: string;
}

export async function sendReferralInvitationEmail(
  params: SendReferralInvitationEmailParams
): Promise<{ success: boolean; message: string; status?: string }> {
  const baseOrigin = params.origin || resolveSiteOrigin();
  const optOutUrl = `${baseOrigin}/surveys/pakistan-banking-map?optOut=${encodeURIComponent(params.toEmail)}`;

  return enqueueAndSendEmail({
    businessKey: params.invitationId
      ? `referral-invite:${params.invitationId}`
      : `referral-invite:${params.toEmail}:${params.referralUrl}`,
    emailType: 'referral_invitation',
    recipientEmail: params.toEmail,
    recipientName: params.colleaguePreferredName?.trim() || 'there',
    campaignId: params.campaignId || null,
    templateData: {
      referrerName: params.referrerPreferredName.trim(),
      campaignTitle: params.campaignTitle || 'Pakistan Banking Expertise Map',
      referralUrl: params.referralUrl,
      optOutUrl,
    },
  });
}

export interface SendSurveyVerificationEmailParams {
  toEmail: string;
  preferredName: string;
  submissionId: string;
  campaignId?: string | null;
  campaignTitle?: string;
  verificationUrl: string;
  expiresAt: Date;
  isResend?: boolean;
}

export async function sendSurveyVerificationEmail(
  params: SendSurveyVerificationEmailParams
): Promise<{ success: boolean; message: string; status?: string }> {
  const expiryMinutes = Math.max(
    1,
    Math.round((params.expiresAt.getTime() - Date.now()) / 60_000)
  );
  const keySuffix = params.isResend ? `:${Date.now()}` : '';
  return enqueueAndSendEmail({
    businessKey: `survey-verify:${params.submissionId}${keySuffix}`,
    emailType: 'verification',
    recipientEmail: params.toEmail,
    recipientName: params.preferredName,
    campaignId: params.campaignId || null,
    containsSensitiveLink: true,
    payloadExpiresAt: params.expiresAt,
    templateData: {
      survey_title: params.campaignTitle || 'Pakistan Banking Expertise Map',
      verification_url: params.verificationUrl,
      expiry_minutes: String(expiryMinutes),
    },
  });
}

export interface SendParticipationConfirmationEmailParams {
  toEmail: string;
  preferredName: string;
  institutionName?: string;
  submissionId: string;
  participantId?: string | null;
  campaignId?: string | null;
  campaignTitle?: string;
  confirmationUrl: string;
}

export async function sendParticipationConfirmationEmail(
  params: SendParticipationConfirmationEmailParams
): Promise<{ success: boolean; message: string; status?: string }> {
  return enqueueAndSendEmail({
    businessKey: `survey-confirmed:${params.submissionId}`,
    emailType: 'participation_confirmation',
    recipientEmail: params.toEmail,
    recipientName: params.preferredName,
    campaignId: params.campaignId || null,
    participantId: params.participantId || null,
    templateData: {
      survey_title: params.campaignTitle || 'Pakistan Banking Expertise Map',
      institution_name: params.institutionName || 'Participating Institution',
      profile_access_url: params.confirmationUrl,
    },
  });
}

export interface SendProfileAccessEmailParams {
  toEmail: string;
  preferredName: string;
  participantId?: string | null;
  accessUrl: string;
  expiresAt: Date;
  requestId: string;
}

export async function sendProfileAccessEmail(
  params: SendProfileAccessEmailParams
): Promise<{ success: boolean; message: string; status?: string }> {
  const expiryMinutes = Math.max(
    1,
    Math.round((params.expiresAt.getTime() - Date.now()) / 60_000)
  );
  return enqueueAndSendEmail({
    businessKey: `profile-access:${params.requestId}`,
    emailType: 'profile_access',
    recipientEmail: params.toEmail,
    recipientName: params.preferredName,
    participantId: params.participantId || null,
    containsSensitiveLink: true,
    payloadExpiresAt: params.expiresAt,
    templateData: {
      profile_access_url: params.accessUrl,
      expiry_minutes: String(expiryMinutes),
    },
  });
}
