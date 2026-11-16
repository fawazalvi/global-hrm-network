import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_EMAIL_TEMPLATES,
  normalizeRuntimeVariables,
  renderBrandedEmail,
  validateRequiredRuntimeVariables,
  validateTemplatePlaceholders,
  validateThemeContrast,
  type ManagedEmailType,
} from '../src/backend/email/templates';
import { DEFAULT_EMAIL_THEME } from '../src/backend/email/layout';

function runQa() {
  console.log('Running Branded Email Template Library QA (no real emails sent)...');

  // 1. Validate all 14 default templates have valid placeholders & render cleanly
  for (const [key, def] of Object.entries(DEFAULT_EMAIL_TEMPLATES)) {
    const check = validateTemplatePlaceholders({
      requiredPlaceholders: def.requiredPlaceholders,
      subject: def.subject,
      bodyHtml: def.bodyHtml,
      bodyText: def.bodyText,
      ctaUrlTemplate: def.ctaUrlTemplate,
    });
    assert.equal(check.valid, true, `Template ${key} failed placeholder check: ${JSON.stringify(check)}`);

    const vars = normalizeRuntimeVariables(def.syntheticData);
    const reqCheck = validateRequiredRuntimeVariables(def.requiredPlaceholders, vars);
    assert.equal(reqCheck.valid, true, `Template ${key} missing synthetic vars: ${reqCheck.missing.join(',')}`);

    const rendered = renderBrandedEmail({
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
        ctaLabel: def.ctaLabel,
        ctaUrlTemplate: def.ctaUrlTemplate,
        bannerKey: def.bannerKey,
        securityOrHelpNote: def.securityOrHelpNote,
        footerText: def.footerText,
        unsubscribeLabel: def.unsubscribeLabel,
      },
      variables: vars,
      theme: DEFAULT_EMAIL_THEME,
    });

    assert.ok(!/\{\{[a-zA-Z0-9_]+\}\}/.test(rendered.subject), `${key}: unresolved placeholder in subject`);
    assert.ok(!/\{\{[a-zA-Z0-9_]+\}\}/.test(rendered.html), `${key}: unresolved placeholder in HTML`);
    assert.ok(!/\{\{[a-zA-Z0-9_]+\}\}/.test(rendered.text), `${key}: unresolved placeholder in text`);
    assert.ok(rendered.html.includes('Global HRM Network'), `${key}: missing canonical brand name`);
    assert.ok(!rendered.html.includes('Global HRMG'), `${key}: must not use Global HRMG`);
    assert.ok(rendered.html.includes('<!--[if mso]>'), `${key}: missing Outlook VML fallback`);
    assert.ok(rendered.html.includes('ghrm-email-logo.png'), `${key}: missing canonical email logo`);
  }

  // 2. Natural greeting fallback when preferred_name is empty
  const noNameRender = renderBrandedEmail({
    template: DEFAULT_EMAIL_TEMPLATES.verification,
    variables: {
      ...DEFAULT_EMAIL_TEMPLATES.verification.syntheticData,
      preferred_name: '',
    },
  });
  assert.ok(noNameRender.html.includes('Hello,'), 'Empty preferred_name should fall back to "Hello,"');
  assert.ok(!noNameRender.html.includes('Hello ,'), 'Must not render awkward "Hello ,"');

  // 3. Long name & long institution name + XSS escaping
  const longRender = renderBrandedEmail({
    template: DEFAULT_EMAIL_TEMPLATES.participation_confirmation,
    variables: {
      ...DEFAULT_EMAIL_TEMPLATES.participation_confirmation.syntheticData,
      preferred_name: 'Muhammad Aurangzeb Alvi-Siddiqui Jr. <script>alert(1)</script>',
      institution_name:
        'Standard Chartered Bank (Pakistan) Limited — Corporate & Institutional Banking Division',
    },
  });
  assert.ok(!longRender.html.includes('<script>alert(1)</script>'));
  assert.ok(longRender.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));

  // 4. Missing required runtime variable fails validation before queueing
  const missingVarCheck = validateRequiredRuntimeVariables(
    DEFAULT_EMAIL_TEMPLATES.verification.requiredPlaceholders,
    normalizeRuntimeVariables({ survey_title: 'Pakistan Banking Expertise Map' })
  );
  assert.equal(missingVarCheck.valid, false);
  assert.deepEqual(missingVarCheck.missing, ['verification_url']);

  // 5. Contrast check rejects illegible light-on-white button colors
  assert.equal(
    validateThemeContrast({
      primaryColor: '#8DBB32', // lime green has low contrast with white text
      deepBlueColor: '#123B70',
      bodyTextColor: '#263445',
      surfaceColor: '#FFFFFF',
    }).valid,
    false
  );
  assert.equal(
    validateThemeContrast({
      primaryColor: DEFAULT_EMAIL_THEME.primaryColor,
      deepBlueColor: DEFAULT_EMAIL_THEME.deepBlueColor,
      bodyTextColor: DEFAULT_EMAIL_THEME.bodyTextColor,
      surfaceColor: DEFAULT_EMAIL_THEME.surfaceColor,
    }).valid,
    true
  );

  // 6. Generate 5 synthetic HTML previews
  const previewTypes: ManagedEmailType[] = [
    'verification',
    'pakistan_launch_invitation',
    'referral_invitation',
    'participation_confirmation',
    'research_findings',
  ];
  const outDir = path.join(
    'C:',
    'Users',
    'Fawaz',
    '.gemini',
    'antigravity',
    'brain',
    'fa1279c5-7c31-46be-b4e1-1f8e8279b112',
    'email-previews'
  );
  fs.mkdirSync(outDir, { recursive: true });

  for (const type of previewTypes) {
    const def = DEFAULT_EMAIL_TEMPLATES[type];
    const rendered = renderBrandedEmail({
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
        ctaLabel: def.ctaLabel,
        ctaUrlTemplate: def.ctaUrlTemplate,
        bannerKey: def.bannerKey,
        securityOrHelpNote: def.securityOrHelpNote,
        footerText: def.footerText,
        unsubscribeLabel: def.unsubscribeLabel,
      },
      variables: def.syntheticData,
      theme: DEFAULT_EMAIL_THEME,
    });
    fs.writeFileSync(path.join(outDir, `${type}.html`), rendered.html, 'utf8');
    fs.writeFileSync(path.join(outDir, `${type}.txt`), rendered.text, 'utf8');
  }

  console.log(`All 14 templates validated & 5 synthetic previews written to ${outDir}`);
}

runQa();
