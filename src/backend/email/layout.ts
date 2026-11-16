import { escapeHtml } from './sanitizer';

export interface EmailThemePalette {
  logoUrl: string;
  bannerUrl?: string | null;
  primaryColor: string; // #0868B5
  deepBlueColor: string; // #123B70
  orangeAccent: string; // #F58220
  greenAccent: string; // #8DBB32
  paleBgColor: string; // #EFF6FC
  bodyTextColor: string; // #263445
  secondaryTextColor: string; // #5C6B7A
  surfaceColor: string; // #FFFFFF
  senderDisplayName: string;
  supportEmail: string;
  websiteUrl: string;
  tagline: string;
  footerTagline: string;
  socialLinks: Array<{ label: string; url: string }>;
}

export const DEFAULT_EMAIL_THEME: EmailThemePalette = {
  logoUrl: '/email-assets/ghrm-email-logo.png',
  bannerUrl: '/email-assets/ghrm-community-banner.jpg',
  primaryColor: '#0868B5',
  deepBlueColor: '#123B70',
  orangeAccent: '#F58220',
  greenAccent: '#8DBB32',
  paleBgColor: '#EFF6FC',
  bodyTextColor: '#263445',
  secondaryTextColor: '#5C6B7A',
  surfaceColor: '#FFFFFF',
  senderDisplayName: 'Global HRM Network',
  supportEmail: 'support@global-hrm.net',
  websiteUrl: 'https://www.global-hrm.net',
  tagline: 'Connecting HR Leaders Worldwide',
  footerTagline: 'Empowering HR Professionals to Connect, Learn & Grow Globally.',
  socialLinks: [],
};

export interface MasterLayoutInput {
  variant: 'transactional' | 'community';
  preheader: string;
  eyebrow?: string | null;
  headline: string;
  greeting: string;
  bodyHtml: string;
  infoPanelTitle?: string | null;
  infoPanelHtml?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  showBanner?: boolean;
  securityOrHelpNote?: string | null;
  footerText: string;
  unsubscribeUrl?: string | null;
  unsubscribeLabel?: string | null;
  theme: EmailThemePalette;
  isTestEmail?: boolean;
}

function resolveAssetUrl(pathOrUrl: string | null | undefined, websiteUrl: string): string {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = (websiteUrl || 'https://www.global-hrm.net').replace(/\/+$/, '');
  const rel = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${rel}`;
}

export function renderMasterEmailHtml(input: MasterLayoutInput): string {
  const t = input.theme;
  const logoSrc = resolveAssetUrl(t.logoUrl, t.websiteUrl);
  const bannerSrc = input.showBanner && t.bannerUrl ? resolveAssetUrl(t.bannerUrl, t.websiteUrl) : '';

  const preheaderSafe = escapeHtml(input.preheader || input.headline);
  const preheaderPadding = '&nbsp;&zwnj;'.repeat(40);

  const testBannerHtml = input.isTestEmail
    ? `<tr>
        <td style="background-color:#FFF7ED;border-bottom:2px solid ${t.orangeAccent};padding:10px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#9A3412;text-align:center;">
          [TEST EMAIL] Administrator-initiated preview &mdash; SMTP acceptance does not guarantee inbox placement.
        </td>
      </tr>`
    : '';

  const eyebrowHtml = input.eyebrow?.trim()
    ? `<p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:0.06em;text-transform:uppercase;color:${t.primaryColor};">
        ${escapeHtml(input.eyebrow.trim())}
      </p>`
    : '';

  const bannerHtml = bannerSrc
    ? `<tr>
        <td style="padding:0;background-color:${t.paleBgColor};border-bottom:1px solid #D9E6F2;">
          <img src="${escapeHtml(bannerSrc)}" alt="${escapeHtml(t.senderDisplayName)} — ${escapeHtml(t.tagline)}" width="620" style="display:block;width:100%;max-width:620px;height:auto;border:0;outline:none;text-decoration:none;" />
        </td>
      </tr>`
    : '';

  const infoPanelHtml =
    input.infoPanelHtml && input.infoPanelHtml.trim()
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0;background-color:${t.paleBgColor};border-left:4px solid ${t.orangeAccent};border-radius:6px;">
          <tr>
            <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:${t.bodyTextColor};">
              ${
                input.infoPanelTitle?.trim()
                  ? `<div style="font-weight:bold;font-size:14px;color:${t.deepBlueColor};margin-bottom:6px;">${escapeHtml(input.infoPanelTitle.trim())}</div>`
                  : ''
              }
              ${input.infoPanelHtml}
            </td>
          </tr>
        </table>`
      : '';

  const safeCtaUrl =
    input.ctaUrl && /^https?:\/\//i.test(input.ctaUrl.trim()) ? input.ctaUrl.trim() : '';

  const ctaHtml =
    input.ctaLabel?.trim() && safeCtaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 18px 0;">
          <tr>
            <td align="left">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(safeCtaUrl)}" style="height:46px;v-text-anchor:middle;width:260px;" arcsize="14%" strokecolor="${t.primaryColor}" fillcolor="${t.primaryColor}">
                <w:anchorlock/>
                <center style="color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;">
                  ${escapeHtml(input.ctaLabel.trim())}
                </center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${escapeHtml(safeCtaUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:${t.primaryColor};color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;line-height:1.2;text-decoration:none;padding:14px 28px;border-radius:6px;border:1px solid ${t.primaryColor};">
                ${escapeHtml(input.ctaLabel.trim())}
              </a>
              <!--<![endif]-->
            </td>
          </tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;background-color:#F8FBFF;border:1px solid #D9E6F2;border-radius:6px;">
          <tr>
            <td style="padding:12px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${t.secondaryTextColor};word-break:break-all;">
              If the button above does not work, copy and paste this link into your browser:<br/>
              <a href="${escapeHtml(safeCtaUrl)}" target="_blank" rel="noopener noreferrer" style="color:${t.primaryColor};text-decoration:underline;word-break:break-all;">${escapeHtml(safeCtaUrl)}</a>
            </td>
          </tr>
        </table>`
      : '';

  const helpNoteHtml = input.securityOrHelpNote?.trim()
    ? `<p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:${t.secondaryTextColor};">
        ${escapeHtml(input.securityOrHelpNote.trim())}
      </p>`
    : '';

  const socialHtml =
    t.socialLinks.length > 0
      ? `<p style="margin:10px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${t.secondaryTextColor};">
          ${t.socialLinks
            .filter((s) => s.label && /^https?:\/\//i.test(s.url))
            .map(
              (s) =>
                `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" style="color:${t.primaryColor};text-decoration:none;margin:0 8px;">${escapeHtml(s.label)}</a>`
            )
            .join(' &middot; ')}
        </p>`
      : '';

  const unsubscribeHtml =
    input.unsubscribeUrl && /^https?:\/\//i.test(input.unsubscribeUrl)
      ? `<p style="margin:10px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${t.secondaryTextColor};">
          <a href="${escapeHtml(input.unsubscribeUrl)}" target="_blank" rel="noopener noreferrer" style="color:${t.secondaryTextColor};text-decoration:underline;">
            ${escapeHtml(input.unsubscribeLabel || 'Unsubscribe or opt out of future communications')}
          </a>
        </p>`
      : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(input.headline)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 640px) {
      .ghrm-container { width: 100% !important; }
      .ghrm-pad { padding: 24px 18px !important; }
      .ghrm-header-pad { padding: 18px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${t.paleBgColor};color:${t.bodyTextColor};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!-- Hidden Preheader -->
  <div style="display:none;font-size:1px;color:${t.paleBgColor};line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheaderSafe}${preheaderPadding}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${t.paleBgColor};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" class="ghrm-container" style="width:620px;max-width:100%;background-color:${t.surfaceColor};border:1px solid #D9E6F2;border-radius:10px;overflow:hidden;">
          ${testBannerHtml}

          <!-- Top Brand Accent Ribbon (Blue / Orange / Green) -->
          <tr>
            <td style="padding:0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="72%" height="5" style="background-color:${t.primaryColor};font-size:0;line-height:0;">&nbsp;</td>
                  <td width="18%" height="5" style="background-color:${t.orangeAccent};font-size:0;line-height:0;">&nbsp;</td>
                  <td width="10%" height="5" style="background-color:${t.greenAccent};font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Light Header with Canonical Logo -->
          <tr>
            <td class="ghrm-header-pad" style="background-color:#FFFFFF;padding:22px 32px;border-bottom:1px solid #E5EEF7;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="left" valign="middle">
                    <a href="${escapeHtml(t.websiteUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                      <img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(t.senderDisplayName)}" width="210" height="78" style="display:block;width:210px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;color:${t.deepBlueColor};font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;" />
                    </a>
                  </td>
                  <td align="right" valign="middle" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:${t.deepBlueColor};">
                    ${input.variant === 'community' ? escapeHtml(t.tagline) : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${bannerHtml}

          <!-- Main Content -->
          <tr>
            <td class="ghrm-pad" style="padding:32px;background-color:${t.surfaceColor};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${t.bodyTextColor};">
              ${eyebrowHtml}
              <h1 style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:bold;color:${t.deepBlueColor};">
                ${escapeHtml(input.headline)}
              </h1>
              <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${t.bodyTextColor};">
                ${escapeHtml(input.greeting)}
              </p>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${t.bodyTextColor};">
                ${input.bodyHtml}
              </div>
              ${infoPanelHtml}
              ${ctaHtml}
              ${helpNoteHtml}
            </td>
          </tr>

          <!-- Footer Ribbon -->
          <tr>
            <td style="padding:0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="60%" height="3" style="background-color:${t.deepBlueColor};font-size:0;line-height:0;">&nbsp;</td>
                  <td width="25%" height="3" style="background-color:${t.orangeAccent};font-size:0;line-height:0;">&nbsp;</td>
                  <td width="15%" height="3" style="background-color:${t.greenAccent};font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Consistent Branded Footer -->
          <tr>
            <td style="background-color:${t.paleBgColor};padding:22px 32px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 6px 0;font-size:13px;font-weight:bold;color:${t.deepBlueColor};">
                ${escapeHtml(t.tagline)}
              </p>
              ${
                t.footerTagline
                  ? `<p style="margin:0 0 10px 0;font-size:12px;color:${t.secondaryTextColor};">${escapeHtml(t.footerTagline)}</p>`
                  : ''
              }
              <p style="margin:0;font-size:12px;line-height:1.5;color:${t.secondaryTextColor};">
                ${escapeHtml(input.footerText)}
              </p>
              <p style="margin:8px 0 0 0;font-size:12px;color:${t.secondaryTextColor};">
                <a href="${escapeHtml(t.websiteUrl)}" target="_blank" rel="noopener noreferrer" style="color:${t.primaryColor};text-decoration:none;font-weight:bold;">${escapeHtml(t.websiteUrl.replace(/^https?:\/\//i, ''))}</a>
                ${t.supportEmail ? ` &middot; <a href="mailto:${escapeHtml(t.supportEmail)}" style="color:${t.primaryColor};text-decoration:none;">${escapeHtml(t.supportEmail)}</a>` : ''}
              </p>
              ${socialHtml}
              ${unsubscribeHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
