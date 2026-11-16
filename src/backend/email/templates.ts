import sanitizeHtml from 'sanitize-html';
import { escapeHtml } from './sanitizer';
import {
  DEFAULT_EMAIL_THEME,
  renderMasterEmailHtml,
  type EmailThemePalette,
} from './layout';

export type ManagedEmailType =
  | 'verification'
  | 'verification_code'
  | 'participation_confirmation'
  | 'referral_invitation'
  | 'pakistan_launch_invitation'
  | 'survey_invitation'
  | 'survey_reminder'
  | 'profile_access'
  | 'research_findings'
  | 'webinar_invitation'
  | 'general_announcement'
  | 'contact_acknowledgement'
  | 'admin_notification'
  | 'account_password';

export const ALLOWLISTED_VARIABLES: Array<{ key: string; description: string }> = [
  { key: 'preferred_name', description: 'Recipient preferred name (falls back to "Hello," if blank)' },
  { key: 'institution_name', description: 'Bank or financial institution name' },
  { key: 'survey_title', description: 'Survey or research initiative title' },
  { key: 'survey_url', description: 'Survey or referral destination URL' },
  { key: 'referrer_name', description: 'Name of the referring colleague' },
  { key: 'verification_url', description: 'Single-use email verification URL' },
  { key: 'verification_code', description: 'One-time verification code (where applicable)' },
  { key: 'expiry_minutes', description: 'Link/code validity in minutes (or expiry timestamp)' },
  { key: 'profile_access_url', description: 'Secure profile-access URL' },
  { key: 'report_url', description: 'Published research findings URL' },
  { key: 'event_title', description: 'Webinar or event title' },
  { key: 'event_date', description: 'Event date and time' },
  { key: 'event_timezone', description: 'Explicit event timezone (e.g., PKT / UTC+5)' },
  { key: 'event_url', description: 'Event registration or details URL' },
  { key: 'support_email', description: 'Configured support email address' },
  { key: 'website_url', description: 'Configured organization website URL' },
  { key: 'unsubscribe_url', description: 'Opt-out or unsubscribe URL' },
  { key: 'current_year', description: 'Current calendar year' },
];

const ALLOWLISTED_KEY_SET = new Set(ALLOWLISTED_VARIABLES.map((v) => v.key));

export interface EmailTemplateDefinition {
  emailType: ManagedEmailType;
  name: string;
  description: string;
  classification: 'transactional' | 'community';
  variant: 'transactional' | 'community';
  defaultStatus: 'published' | 'draft';
  subject: string;
  preheader: string;
  eyebrow: string;
  heading: string;
  greeting: string;
  bodyHtml: string;
  bodyText: string;
  infoPanelTitle?: string;
  infoPanelBody?: string;
  ctaLabel: string;
  ctaUrlTemplate: string;
  bannerKey?: 'community_globe' | null;
  securityOrHelpNote?: string;
  footerText: string;
  unsubscribeLabel?: string;
  requiredPlaceholders: string[];
  syntheticData: Record<string, string>;
}

export const DEFAULT_EMAIL_TEMPLATES: Record<ManagedEmailType, EmailTemplateDefinition> = {
  verification: {
    emailType: 'verification',
    name: 'Official Email Verification',
    description: 'Verify a participant’s official work email address after survey submission.',
    classification: 'transactional',
    variant: 'transactional',
    defaultStatus: 'published',
    subject: 'Verify your official email for {{survey_title}}',
    preheader: 'Confirm your work email address to verify your {{survey_title}} submission.',
    eyebrow: 'Email Verification',
    heading: 'Verify Your Official Email Address',
    greeting: 'Hello {{preferred_name}},',
    bodyHtml: `<p>Thank you for submitting your profile to <strong>{{survey_title}}</strong>.</p>
<p>Please confirm your official work email address using the button below to complete your verification. Participation is open to professionals across all banking functions—not only HR staff.</p>`,
    bodyText: `Thank you for submitting your profile to {{survey_title}}.

Please confirm your official work email address using the link below (valid for {{expiry_minutes}} minutes):
{{verification_url}}`,
    infoPanelTitle: 'Verification Details',
    infoPanelBody: 'This single-use link expires in {{expiry_minutes}} minutes. Your official email address stays private and is never published.',
    ctaLabel: 'Verify Email',
    ctaUrlTemplate: '{{verification_url}}',
    bannerKey: null,
    securityOrHelpNote: 'If you did not submit this form, you can safely ignore this message.',
    footerText: 'This transactional verification message was sent by Global HRM Network.',
    requiredPlaceholders: ['verification_url', 'survey_title'],
    syntheticData: {
      preferred_name: 'Fawaz Alvi',
      institution_name: 'Habib Bank Limited',
      survey_title: 'Pakistan Banking Expertise Map',
      verification_url: 'https://www.global-hrm.net/surveys/pakistan-banking-map/verify?token=sample-preview',
      expiry_minutes: '1440',
      support_email: 'support@global-hrm.net',
      website_url: 'https://www.global-hrm.net',
    },
  },

  verification_code: {
    emailType: 'verification_code',
    name: 'Verification Code (OTP)',
    description: 'Draft template for displaying a one-time verification code where OTP verification is enabled.',
    classification: 'transactional',
    variant: 'transactional',
    defaultStatus: 'draft',
    subject: 'Your Global HRM Network verification code: {{verification_code}}',
    preheader: 'Use verification code {{verification_code}} to confirm your email address.',
    eyebrow: 'Security Verification',
    heading: 'Enter Your Verification Code',
    greeting: 'Hello {{preferred_name}},',
    bodyHtml: `<p>Use the one-time verification code below to confirm your email address on the Global HRM Network website.</p>`,
    bodyText: `Your verification code is: {{verification_code}}
This code expires in {{expiry_minutes}} minutes.
Enter it at: {{website_url}}`,
    infoPanelTitle: 'One-Time Code',
    infoPanelBody: 'Code: {{verification_code}} · Expires in {{expiry_minutes}} minutes.',
    ctaLabel: 'Enter Code on Website',
    ctaUrlTemplate: '{{website_url}}',
    bannerKey: null,
    securityOrHelpNote: 'Never share this verification code with anyone. Global HRM Network will never ask for it by phone.',
    footerText: 'Security verification message from Global HRM Network.',
    requiredPlaceholders: ['verification_code', 'expiry_minutes'],
    syntheticData: {
      preferred_name: 'Fawaz Alvi',
      verification_code: '482910',
      expiry_minutes: '15',
      website_url: 'https://www.global-hrm.net',
      support_email: 'support@global-hrm.net',
    },
  },

  participation_confirmation: {
    emailType: 'participation_confirmation',
    name: 'Participation Confirmation',
    description: 'Confirm a completed, verified survey profile.',
    classification: 'transactional',
    variant: 'transactional',
    defaultStatus: 'published',
    subject: 'Participation Confirmed: {{survey_title}}',
    preheader: 'Your official email is verified and your {{survey_title}} profile is confirmed.',
    eyebrow: 'Participation Confirmed',
    heading: 'Thank You for Contributing',
    greeting: 'Hello {{preferred_name}},',
    bodyHtml: `<p>Your official email address has been verified and your contribution to <strong>{{survey_title}}</strong> is now confirmed.</p>
<p>By sharing your experience, you help build a clearer collective picture of capabilities across Pakistan&rsquo;s banking sector—spanning business, technology, risk, operations, and HR leadership.</p>`,
    bodyText: `Your official email address has been verified and your contribution to {{survey_title}} is now confirmed.

View or manage your participation:
{{profile_access_url}}`,
    infoPanelTitle: 'Submission Summary',
    infoPanelBody: 'Initiative: {{survey_title}} · Institution: {{institution_name}} · Findings are reported strictly in aggregate.',
    ctaLabel: 'View My Profile',
    ctaUrlTemplate: '{{profile_access_url}}',
    bannerKey: null,
    securityOrHelpNote: 'Questions about your submission? Contact us at {{support_email}}.',
    footerText: 'Transactional confirmation from Global HRM Network.',
    requiredPlaceholders: ['survey_title', 'profile_access_url'],
    syntheticData: {
      preferred_name: 'Fawaz Alvi',
      institution_name: 'United Bank Limited',
      survey_title: 'Pakistan Banking Expertise Map',
      profile_access_url: 'https://www.global-hrm.net/surveys/pakistan-banking-map',
      support_email: 'support@global-hrm.net',
      website_url: 'https://www.global-hrm.net',
    },
  },

  referral_invitation: {
    emailType: 'referral_invitation',
    name: 'Colleague Referral Invitation',
    description: 'Invite a banking colleague and clearly identify the referring colleague.',
    classification: 'community',
    variant: 'community',
    defaultStatus: 'published',
    subject: '{{referrer_name}} invites you to {{survey_title}}',
    preheader: '{{referrer_name}} invited you to contribute to {{survey_title}} (approx. 3 minutes).',
    eyebrow: 'Colleague Invitation',
    heading: 'You Are Invited to {{survey_title}}',
    greeting: 'Hello {{preferred_name}},',
    bodyHtml: `<p><strong>{{referrer_name}}</strong> has invited you to participate in Global HRM Network&rsquo;s <strong>{{survey_title}}</strong>.</p>
<p>This sector-wide initiative welcomes professionals across all banking functions—including operations, risk, digital, corporate banking, and HR—to map leadership capabilities and domain strengths.</p>`,
    bodyText: `{{referrer_name}} has invited you to participate in Global HRM Network's {{survey_title}}.

Participation takes approximately 3 minutes:
{{survey_url}}

Opt out of future invitations:
{{unsubscribe_url}}`,
    infoPanelTitle: 'Quick Overview',
    infoPanelBody: 'Approximately 3 minutes · Your email stays private · Findings reported in aggregate.',
    ctaLabel: 'Participate in the Survey',
    ctaUrlTemplate: '{{survey_url}}',
    bannerKey: 'community_globe',
    securityOrHelpNote: 'Participation is voluntary. You may choose on the survey page whether to link your response to this colleague invitation.',
    footerText: 'Sent by Global HRM Network on behalf of {{referrer_name}}.',
    unsubscribeLabel: 'Decline and opt out of future invitations',
    requiredPlaceholders: ['referrer_name', 'survey_title', 'survey_url', 'unsubscribe_url'],
    syntheticData: {
      preferred_name: 'Hina Saqib',
      referrer_name: 'Fawaz Alvi',
      survey_title: 'Pakistan Banking Expertise Map',
      survey_url: 'https://www.global-hrm.net/surveys/pakistan-banking-map?ref=sample-code',
      unsubscribe_url: 'https://www.global-hrm.net/surveys/pakistan-banking-map?optOut=sample',
      support_email: 'support@global-hrm.net',
      website_url: 'https://www.global-hrm.net',
    },
  },

  pakistan_launch_invitation: {
    emailType: 'pakistan_launch_invitation',
    name: 'Pakistan Launch Campaign Invitation',
    description: 'Branded launch invitation for the Pakistan Banking Expertise Map.',
    classification: 'community',
    variant: 'community',
    defaultStatus: 'published',
    subject: 'Pakistan Banking Expertise Map — Join Global HRM Network’s Inaugural Initiative',
    preheader: 'Global HRM Network is launching in Pakistan. Share your banking expertise in ~3 minutes.',
    eyebrow: 'Global HRM Network is Launching in Pakistan',
    heading: 'Pakistan Banking Expertise Map',
    greeting: 'Hello {{preferred_name}},',
    bodyHtml: `<p style="font-size:17px;font-weight:bold;color:#123B70;margin-top:0;">Your expertise can help shape what comes next.</p>
<p>Join our inaugural initiative to bring together the experience and expertise powering Pakistan&rsquo;s banking sector. Share your professional profile and help build a collective picture of the industry&rsquo;s strengths&mdash;informing future research, learning, and collaboration.</p>
<p>Professionals across <strong>all banking functions</strong>&mdash;not only HR staff&mdash;are invited to contribute.</p>
<p>Receive research insights when published and choose whether to hear about future opportunities to contribute your expertise.</p>`,
    bodyText: `Global HRM Network is Launching in Pakistan
Pakistan Banking Expertise Map

Your expertise can help shape what comes next.

Join our inaugural initiative to bring together the experience and expertise powering Pakistan's banking sector. Participation welcomes professionals across all banking functions—not only HR staff.

Approximately 3 minutes · Your email stays private · Findings reported in aggregate

Join the Expertise Map:
{{survey_url}}

Unsubscribe:
{{unsubscribe_url}}`,
    infoPanelTitle: 'What to Expect',
    infoPanelBody: 'Approximately 3 minutes · Your email stays private · Findings reported in aggregate.',
    ctaLabel: 'Join the Expertise Map',
    ctaUrlTemplate: '{{survey_url}}',
    bannerKey: 'community_globe',
    securityOrHelpNote: 'You remain in full control of your communications preferences.',
    footerText: 'Global HRM Network — Pakistan Launch Initiative.',
    unsubscribeLabel: 'Unsubscribe from future research invitations',
    requiredPlaceholders: ['survey_url', 'unsubscribe_url'],
    syntheticData: {
      preferred_name: 'Fawaz Alvi',
      survey_title: 'Pakistan Banking Expertise Map',
      survey_url: 'https://www.global-hrm.net/surveys/pakistan-banking-map',
      unsubscribe_url: 'https://www.global-hrm.net/surveys/pakistan-banking-map?optOut=sample',
      support_email: 'support@global-hrm.net',
      website_url: 'https://www.global-hrm.net',
    },
  },

  survey_invitation: {
    emailType: 'survey_invitation',
    name: 'Survey Invitation',
    description: 'Consent-gated invitation to a Global HRM Network research initiative.',
    classification: 'community',
    variant: 'community',
    defaultStatus: 'published',
    subject: 'You are invited: {{survey_title}}',
    preheader: 'Contribute your perspective to {{survey_title}}.',
    eyebrow: 'Research Invitation',
    heading: '{{survey_title}}',
    greeting: 'Hello {{preferred_name}},',
    bodyHtml: `<p>Because you opted in to hear about Global HRM Network research initiatives, we invite you to participate in <strong>{{survey_title}}</strong>.</p>
<p>Your participation helps strengthen sector-wide benchmarking and peer insights. Professionals across all banking and organizational functions are welcome.</p>`,
    bodyText: `You are invited to participate in {{survey_title}}:
{{survey_url}}

Unsubscribe from future invitations:
{{unsubscribe_url}}`,
    infoPanelTitle: 'Participation Summary',
    infoPanelBody: 'Responses are analyzed in aggregate. Your email remains confidential.',
    ctaLabel: 'Start Survey',
    ctaUrlTemplate: '{{survey_url}}',
    bannerKey: 'community_globe',
    footerText: 'Sent to opted-in participants by Global HRM Network.',
    unsubscribeLabel: 'Unsubscribe from future survey invitations',
    requiredPlaceholders: ['survey_title', 'survey_url', 'unsubscribe_url'],
    syntheticData: {
      preferred_name: 'Fawaz Alvi',
      survey_title: 'Pakistan Banking Expertise Map',
      survey_url: 'https://www.global-hrm.net/surveys/pakistan-banking-map',
      unsubscribe_url: 'https://www.global-hrm.net/surveys/pakistan-banking-map?optOut=sample',
      support_email: 'support@global-hrm.net',
      website_url: 'https://www.global-hrm.net',
    },
  },

  survey_reminder: {
    emailType: 'survey_reminder',
    name: 'Survey Reminder',
    description: 'Draft reminder template for eligible non-completers (does not enable automatic sending).',
    classification: 'community',
    variant: 'community',
    defaultStatus: 'draft',
    subject: 'Reminder: Complete your {{survey_title}} submission',
    preheader: 'Pick up where you left off on {{survey_title}}.',
    eyebrow: 'Friendly Reminder',
    heading: 'Continue Your {{survey_title}} Submission',
    greeting: 'Hello {{preferred_name}},',
    bodyHtml: `<p>You recently started or were invited to <strong>{{survey_title}}</strong>. It takes just a few minutes to complete and verify your response.</p>`,
    bodyText: `Continue your {{survey_title}} submission:
{{survey_url}}

Unsubscribe from reminders:
{{unsubscribe_url}}`,
    infoPanelTitle: 'Why It Matters',
    infoPanelBody: 'Your perspective contributes to anonymized industry benchmarking across functions.',
    ctaLabel: 'Continue Survey',
    ctaUrlTemplate: '{{survey_url}}',
    bannerKey: null,
    footerText: 'Reminder sent by Global HRM Network.',
    unsubscribeLabel: 'Opt out of survey reminders',
    requiredPlaceholders: ['survey_title', 'survey_url', 'unsubscribe_url'],
    syntheticData: {
      preferred_name: 'Fawaz Alvi',
      survey_title: 'Pakistan Banking Expertise Map',
      survey_url: 'https://www.global-hrm.net/surveys/pakistan-banking-map',
      unsubscribe_url: 'https://www.global-hrm.net/surveys/pakistan-banking-map?optOut=sample',
      support_email: 'support@global-hrm.net',
      website_url: 'https://www.global-hrm.net',
    },
  },

  profile_access: {
    emailType: 'profile_access',
    name: 'Secure Profile Access',
    description: 'Provide a purpose-specific, time-limited link to access a stored profile.',
    classification: 'transactional',
    variant: 'transactional',
    defaultStatus: 'published',
    subject: 'Your Secure Global HRM Network Profile Access Link',
    preheader: 'Use your time-limited link to access your profile.',
    eyebrow: 'Secure Access',
    heading: 'Access Your Stored Profile',
    greeting: 'Hello {{preferred_name}},',
    bodyHtml: `<p>You requested a secure link to access your Global HRM Network profile.</p>
<p>For your protection, this link is single-purpose and time-limited.</p>`,
    bodyText: `Use this secure link to access your Global HRM Network profile (expires in {{expiry_minutes}} minutes):
{{profile_access_url}}`,
    infoPanelTitle: 'Security Notice',
    infoPanelBody: 'Expires in {{expiry_minutes}} minutes. Do not forward this email to others.',
    ctaLabel: 'Access My Profile',
    ctaUrlTemplate: '{{profile_access_url}}',
    bannerKey: null,
    securityOrHelpNote: 'If you did not request profile access, please ignore this email or contact {{support_email}}.',
    footerText: 'Security message from Global HRM Network.',
    requiredPlaceholders: ['profile_access_url', 'expiry_minutes'],
    syntheticData: {
      preferred_name: 'Fawaz Alvi',
      profile_access_url: 'https://www.global-hrm.net/profile?token=sample-access-token',
      expiry_minutes: '60',
      support_email: 'support@global-hrm.net',
      website_url: 'https://www.global-hrm.net',
    },
  },

  research_findings: {
    emailType: 'research_findings',
    name: 'Research Findings Announcement',
    description: 'Draft template for sharing published aggregate research findings.',
    classification: 'community',
    variant: 'community',
    defaultStatus: 'draft',
    subject: 'Published Findings: {{survey_title}}',
    preheader: 'Read the anonymized sector insights from {{survey_title}}.',
    eyebrow: 'Research Insights',
    heading: '{{survey_title}} — Summary Findings',
    greeting: 'Hello {{preferred_name}},',
    bodyHtml: `<p>Thank you for your interest in <strong>{{survey_title}}</strong>. The aggregated summary report is now available to read.</p>`,
    bodyText: `Read the published findings for {{survey_title}}:
{{report_url}}

Unsubscribe:
{{unsubscribe_url}}`,
    ctaLabel: 'Read the Findings',
    ctaUrlTemplate: '{{report_url}}',
    bannerKey: 'community_globe',
    footerText: 'Research update from Global HRM Network.',
    unsubscribeLabel: 'Unsubscribe from research updates',
    requiredPlaceholders: ['survey_title', 'report_url', 'unsubscribe_url'],
    syntheticData: {
      preferred_name: 'Fawaz Alvi',
      survey_title: 'Pakistan Banking Expertise Map',
      report_url: 'https://www.global-hrm.net',
      unsubscribe_url: 'https://www.global-hrm.net/surveys/pakistan-banking-map?optOut=sample',
      support_email: 'support@global-hrm.net',
      website_url: 'https://www.global-hrm.net',
    },
  },

  webinar_invitation: {
    emailType: 'webinar_invitation',
    name: 'Webinar / Event Invitation',
    description: 'Draft template for announcing a configured webinar or executive roundtable.',
    classification: 'community',
    variant: 'community',
    defaultStatus: 'draft',
    subject: 'Invitation: {{event_title}}',
    preheader: 'Join {{event_title}} on {{event_date}} ({{event_timezone}}).',
    eyebrow: 'Event Invitation',
    heading: '{{event_title}}',
    greeting: 'Hello {{preferred_name}},',
    bodyHtml: `<p>You are invited to join <strong>{{event_title}}</strong>, hosted by Global HRM Network.</p>`,
    bodyText: `{{event_title}}
Date & Time: {{event_date}} ({{event_timezone}})

View Event / Register:
{{event_url}}

Unsubscribe:
{{unsubscribe_url}}`,
    infoPanelTitle: 'Schedule',
    infoPanelBody: 'Date & Time: {{event_date}} ({{event_timezone}}).',
    ctaLabel: 'View Event / Register',
    ctaUrlTemplate: '{{event_url}}',
    bannerKey: 'community_globe',
    footerText: 'Event invitation from Global HRM Network.',
    unsubscribeLabel: 'Unsubscribe from event invitations',
    requiredPlaceholders: ['event_title', 'event_date', 'event_timezone', 'event_url', 'unsubscribe_url'],
    syntheticData: {
      preferred_name: 'Fawaz Alvi',
      event_title: 'Pakistan Banking Leadership Roundtable',
      event_date: 'December 10, 2026 at 3:00 PM',
      event_timezone: 'PKT (UTC+5)',
      event_url: 'https://www.global-hrm.net',
      unsubscribe_url: 'https://www.global-hrm.net/surveys/pakistan-banking-map?optOut=sample',
      support_email: 'support@global-hrm.net',
      website_url: 'https://www.global-hrm.net',
    },
  },

  general_announcement: {
    emailType: 'general_announcement',
    name: 'General Announcement',
    description: 'Draft template for concise Global HRM Network community updates.',
    classification: 'community',
    variant: 'community',
    defaultStatus: 'draft',
    subject: 'Update from Global HRM Network',
    preheader: 'Important community update from Global HRM Network.',
    eyebrow: 'Community Update',
    heading: 'Global HRM Network Update',
    greeting: 'Hello {{preferred_name}},',
    bodyHtml: `<p>We are sharing a brief update on Global HRM Network&rsquo;s ongoing initiatives and research programs.</p>`,
    bodyText: `Global HRM Network Update

Visit our website: {{website_url}}
Unsubscribe: {{unsubscribe_url}}`,
    ctaLabel: 'Visit Website',
    ctaUrlTemplate: '{{website_url}}',
    bannerKey: null,
    footerText: 'Community update from Global HRM Network.',
    unsubscribeLabel: 'Unsubscribe from community updates',
    requiredPlaceholders: ['website_url', 'unsubscribe_url'],
    syntheticData: {
      preferred_name: 'Fawaz Alvi',
      website_url: 'https://www.global-hrm.net',
      unsubscribe_url: 'https://www.global-hrm.net/surveys/pakistan-banking-map?optOut=sample',
      support_email: 'support@global-hrm.net',
    },
  },

  contact_acknowledgement: {
    emailType: 'contact_acknowledgement',
    name: 'Contact Acknowledgement',
    description: 'Draft template to confirm receipt of an enquiry submitted on the website.',
    classification: 'transactional',
    variant: 'transactional',
    defaultStatus: 'draft',
    subject: 'We received your message — Global HRM Network',
    preheader: 'Thank you for contacting Global HRM Network.',
    eyebrow: 'Enquiry Received',
    heading: 'Thank You for Contacting Us',
    greeting: 'Hello {{preferred_name}},',
    bodyHtml: `<p>We have received your message and our team will review it shortly.</p>`,
    bodyText: `Thank you for contacting Global HRM Network. We have received your enquiry and will respond as soon as possible.
Support: {{support_email}}`,
    ctaLabel: 'Visit Global HRM Network',
    ctaUrlTemplate: '{{website_url}}',
    bannerKey: null,
    footerText: 'Automated enquiry acknowledgement from Global HRM Network.',
    requiredPlaceholders: ['support_email'],
    syntheticData: {
      preferred_name: 'Fawaz Alvi',
      support_email: 'support@global-hrm.net',
      website_url: 'https://www.global-hrm.net',
    },
  },

  admin_notification: {
    emailType: 'admin_notification',
    name: 'Administrator Notification',
    description: 'Operational and membership notification template.',
    classification: 'transactional',
    variant: 'transactional',
    defaultStatus: 'published',
    subject: 'Global HRM Network Notification',
    preheader: 'Operational update from Global HRM Network.',
    eyebrow: 'Platform Notification',
    heading: 'Administrative Update',
    greeting: 'Hello {{preferred_name}},',
    bodyHtml: `<p>An administrative event or membership update has been recorded on Global HRM Network for {{institution_name}}.</p>`,
    bodyText: `An administrative event or membership update has been recorded on Global HRM Network.
Open portal: {{website_url}}`,
    ctaLabel: 'Open Admin Dashboard',
    ctaUrlTemplate: '{{website_url}}',
    bannerKey: null,
    footerText: 'Operational notification from Global HRM Network.',
    requiredPlaceholders: ['website_url'],
    syntheticData: {
      preferred_name: 'System Admin',
      institution_name: 'Global HRM Network',
      website_url: 'https://www.global-hrm.net/admin/dashboard',
      support_email: 'support@global-hrm.net',
    },
  },

  account_password: {
    emailType: 'account_password',
    name: 'Account & Password Email',
    description: 'Sent when an administrator provisions an account or issues login access.',
    classification: 'transactional',
    variant: 'transactional',
    defaultStatus: 'published',
    subject: 'Your Global HRM Network Account Access',
    preheader: 'Your Global HRM Network account is ready.',
    eyebrow: 'Account Access',
    heading: 'Your Account Is Ready',
    greeting: 'Hello {{preferred_name}},',
    bodyHtml: `<p>Your Global HRM Network account has been prepared. Click below to sign in to the portal.</p>`,
    bodyText: `Your Global HRM Network account has been prepared. Sign in here:
{{profile_access_url}}`,
    ctaLabel: 'Sign In to Account',
    ctaUrlTemplate: '{{profile_access_url}}',
    bannerKey: null,
    securityOrHelpNote: 'For account assistance, contact {{support_email}}.',
    footerText: 'Account security message from Global HRM Network.',
    requiredPlaceholders: ['profile_access_url'],
    syntheticData: {
      preferred_name: 'Fawaz Alvi',
      profile_access_url: 'https://www.global-hrm.net/login',
      support_email: 'support@global-hrm.net',
      website_url: 'https://www.global-hrm.net',
    },
  },
};

export function sanitizeTemplateBodyHtml(rawHtml: string): string {
  return sanitizeHtml(rawHtml, {
    allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'code', 'a'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      p: ['style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard',
  });
}

export function validateTemplatePlaceholders(params: {
  requiredPlaceholders: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  ctaUrlTemplate?: string | null;
}): { valid: boolean; missing: string[]; unknown: string[] } {
  const combined = `${params.subject}\n${params.bodyHtml}\n${params.bodyText}\n${params.ctaUrlTemplate || ''}`;
  const missing = params.requiredPlaceholders.filter((key) => !combined.includes(`{{${key}}}`));

  const foundKeys = new Set<string>();
  const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(combined)) !== null) {
    foundKeys.add(match[1]);
  }
  const unknown = Array.from(foundKeys).filter((k) => !ALLOWLISTED_KEY_SET.has(k));

  return {
    valid: missing.length === 0 && unknown.length === 0,
    missing,
    unknown,
  };
}

export function normalizeRuntimeVariables(raw: Record<string, string | undefined | null>): Record<string, string> {
  const out: Record<string, string> = {
    current_year: String(new Date().getFullYear()),
  };
  const aliases: Record<string, string> = {
    recipientName: 'preferred_name',
    campaignTitle: 'survey_title',
    verificationUrl: 'verification_url',
    referralUrl: 'survey_url',
    optOutUrl: 'unsubscribe_url',
    referrerName: 'referrer_name',
    accessUrl: 'profile_access_url',
    loginUrl: 'profile_access_url',
    actionUrl: 'website_url',
    confirmationUrl: 'profile_access_url',
  };

  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null) continue;
    const mapped = aliases[k] || k;
    if (ALLOWLISTED_KEY_SET.has(mapped)) {
      out[mapped] = String(v).trim();
    }
  }
  return out;
}

export function validateRequiredRuntimeVariables(
  required: string[],
  vars: Record<string, string>
): { valid: boolean; missing: string[] } {
  const missing = required.filter((k) => !vars[k] || !vars[k].trim());
  return { valid: missing.length === 0, missing };
}

function interpolateText(template: string, vars: Record<string, string>, escapeValues: boolean): string {
  // Handle natural greeting fallback: "Hello {{preferred_name}}," -> "Hello," when blank
  let result = template;
  if (!vars.preferred_name) {
    result = result.replace(/Hello\s+\{\{preferred_name\}\}\s*,/gi, 'Hello,');
  }
  result = result.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_m, key: string) => {
    const val = vars[key] ?? '';
    return escapeValues ? escapeHtml(val) : val;
  });
  return result;
}

export function renderBrandedEmail(params: {
  template: {
    variant: 'transactional' | 'community';
    subject: string;
    preheader: string;
    eyebrow?: string | null;
    heading: string;
    greeting: string;
    bodyHtml: string;
    bodyText: string;
    infoPanelTitle?: string | null;
    infoPanelBody?: string | null;
    ctaLabel?: string | null;
    ctaUrlTemplate?: string | null;
    bannerKey?: string | null;
    securityOrHelpNote?: string | null;
    footerText: string;
    unsubscribeLabel?: string | null;
  };
  variables: Record<string, string | undefined | null>;
  theme?: EmailThemePalette;
  isTestEmail?: boolean;
}): { subject: string; html: string; text: string } {
  const theme = params.theme || DEFAULT_EMAIL_THEME;
  const vars = normalizeRuntimeVariables({
    support_email: theme.supportEmail,
    website_url: theme.websiteUrl,
    ...params.variables,
  });

  const subject = interpolateText(params.template.subject, vars, false)
    .replace(/[\r\n]+/g, ' ')
    .trim();
  const preheader = interpolateText(params.template.preheader || subject, vars, false);
  const eyebrow = params.template.eyebrow
    ? interpolateText(params.template.eyebrow, vars, false)
    : null;
  const headline = interpolateText(params.template.heading, vars, false);
  const greeting = interpolateText(params.template.greeting || 'Hello {{preferred_name}},', vars, false);

  const sanitizedBody = sanitizeTemplateBodyHtml(params.template.bodyHtml);
  const bodyHtml = interpolateText(sanitizedBody, vars, true);

  const infoPanelHtml = params.template.infoPanelBody?.trim()
    ? escapeHtml(interpolateText(params.template.infoPanelBody, vars, false))
    : null;

  const ctaUrl = params.template.ctaUrlTemplate
    ? interpolateText(params.template.ctaUrlTemplate, vars, false).trim()
    : '';
  const securityOrHelpNote = params.template.securityOrHelpNote
    ? interpolateText(params.template.securityOrHelpNote, vars, false)
    : null;
  const footerText = interpolateText(params.template.footerText, vars, false);

  const html = renderMasterEmailHtml({
    variant: params.template.variant,
    preheader,
    eyebrow,
    headline,
    greeting,
    bodyHtml,
    infoPanelTitle: params.template.infoPanelTitle,
    infoPanelHtml,
    ctaLabel: params.template.ctaLabel,
    ctaUrl,
    showBanner: params.template.bannerKey === 'community_globe',
    securityOrHelpNote,
    footerText,
    unsubscribeUrl: vars.unsubscribe_url || null,
    unsubscribeLabel: params.template.unsubscribeLabel || null,
    theme,
    isTestEmail: params.isTestEmail,
  });

  const textGreeting = greeting;
  const textBody = interpolateText(params.template.bodyText, vars, false);
  const textFooter = footerText;
  const text = [
    theme.senderDisplayName,
    theme.tagline,
    '',
    headline,
    '',
    textGreeting,
    '',
    textBody,
    '',
    '---',
    textFooter,
    theme.footerTagline,
    theme.websiteUrl,
  ]
    .filter((line) => line !== undefined && line !== null)
    .join('\n');

  return { subject, html, text };
}

// WCAG 2.1 contrast ratio helper to prevent illegible theme color choices
function hexToLuminance(hex: string): number | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function getContrastRatio(hex1: string, hex2: string): number | null {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  if (l1 === null || l2 === null) return null;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function validateThemeContrast(palette: {
  primaryColor: string;
  deepBlueColor: string;
  bodyTextColor: string;
  surfaceColor: string;
}): { valid: boolean; error?: string } {
  const buttonRatio = getContrastRatio(palette.primaryColor, '#FFFFFF');
  if (buttonRatio === null || buttonRatio < 4.5) {
    return {
      valid: false,
      error: `Primary button color (${palette.primaryColor}) must have at least 4.5:1 contrast with white button text (current: ${buttonRatio ? buttonRatio.toFixed(2) : 'invalid hex'}).`,
    };
  }
  const bodyRatio = getContrastRatio(palette.bodyTextColor, palette.surfaceColor);
  if (bodyRatio === null || bodyRatio < 4.5) {
    return {
      valid: false,
      error: `Body text color (${palette.bodyTextColor}) must have at least 4.5:1 contrast against surface (${palette.surfaceColor}).`,
    };
  }
  const headingRatio = getContrastRatio(palette.deepBlueColor, palette.surfaceColor);
  if (headingRatio === null || headingRatio < 4.5) {
    return {
      valid: false,
      error: `Heading deep blue color (${palette.deepBlueColor}) must have at least 4.5:1 contrast against surface (${palette.surfaceColor}).`,
    };
  }
  return { valid: true };
}
