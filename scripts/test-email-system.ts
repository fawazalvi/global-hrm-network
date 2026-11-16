import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  decryptEmailSecret,
  EmailCryptoError,
  encryptEmailSecret,
} from '../src/backend/email/crypto';
import {
  validateMailHostPolicy,
  validateSenderCompatibility,
  isUnencryptedSmtpAllowed,
} from '../src/backend/email/validation';
import {
  buildSafeTextPreview,
  sanitizeInboundHtml,
} from '../src/backend/email/sanitizer';
import {
  DEFAULT_EMAIL_TEMPLATES,
  renderBrandedEmail,
  validateTemplatePlaceholders,
} from '../src/backend/email/templates';
import {
  computeSmtpConfigHash,
  redactEmailConfig,
} from '../src/backend/email/service';

function runTests() {
  console.log('Running Email Settings & Service unit tests (no real emails sent)...');

  // 1. Encryption key missing error
  delete process.env.EMAIL_CONFIG_ENCRYPTION_KEY;
  assert.throws(() => encryptEmailSecret('secret'), EmailCryptoError);

  // 2. Encrypt & decrypt roundtrip
  const testKey = crypto.randomBytes(32).toString('hex');
  process.env.EMAIL_CONFIG_ENCRYPTION_KEY = testKey;
  const encrypted = encryptEmailSecret('super-secret-mailbox-pass');
  assert.ok(encrypted.startsWith('v1:'));
  assert.ok(!encrypted.includes('super-secret-mailbox-pass'));
  assert.equal(decryptEmailSecret(encrypted), 'super-secret-mailbox-pass');

  // 3. Wrong key failure & rotation support
  const newKey = crypto.randomBytes(32).toString('hex');
  process.env.EMAIL_CONFIG_ENCRYPTION_KEY = newKey;
  delete process.env.EMAIL_CONFIG_ENCRYPTION_KEY_PREVIOUS;
  assert.throws(() => decryptEmailSecret(encrypted), EmailCryptoError);

  process.env.EMAIL_CONFIG_ENCRYPTION_KEY_PREVIOUS = testKey;
  assert.equal(decryptEmailSecret(encrypted), 'super-secret-mailbox-pass');

  // 4. Redaction never returns encrypted or plaintext secrets
  const mockDbConfig: any = {
    id: 'cfg-1',
    status: 'draft',
    version: 1,
    smtpEnabled: true,
    smtpHost: 'mail.global-hrm.net',
    smtpPort: 587,
    smtpSecurity: 'starttls',
    smtpAuthEnabled: true,
    smtpUsername: 'noreply@global-hrm.net',
    smtpPasswordEncrypted: encrypted,
    smtpConnectionTimeoutMs: 10000,
    smtpRateLimitPerMinute: 30,
    smtpMaxRetries: 3,
    fromDisplayName: 'Global HRM Network',
    fromEmail: 'noreply@global-hrm.net',
    replyToEmail: 'support@global-hrm.net',
    supportEmail: 'support@global-hrm.net',
    footerText: '',
    websiteUrl: 'https://global-hrm.net',
    senderOverridesJson: null,
    imapEnabled: true,
    imapHost: 'mail.global-hrm.net',
    imapPort: 993,
    imapSecurity: 'implicit_tls',
    imapUsername: 'noreply@global-hrm.net',
    imapPasswordEncrypted: encrypted,
    imapFolder: 'INBOX',
    imapPollingIntervalSec: 120,
    imapInitialSyncMode: 'after_activation',
    imapRetentionDays: 90,
    imapActivatedAt: null,
    lastSmtpTestAt: null,
    lastSmtpTestSuccess: null,
    lastSmtpTestMessage: null,
    lastSmtpTestedHash: null,
    lastImapTestAt: null,
    lastImapTestSuccess: null,
    lastImapTestMessage: null,
    lastImapTestedHash: null,
    activatedAt: null,
    updatedAt: new Date(),
  };
  const redacted = redactEmailConfig(mockDbConfig);
  assert.equal(redacted.hasSmtpPassword, true);
  assert.equal(redacted.hasImapPassword, true);
  assert.equal((redacted as any).smtpPasswordEncrypted, undefined);
  assert.equal((redacted as any).imapPasswordEncrypted, undefined);
  assert.ok(!JSON.stringify(redacted).includes(encrypted));

  // 5. Config hash changes when SMTP host changes (gates activation)
  const hash1 = computeSmtpConfigHash(mockDbConfig);
  const hash2 = computeSmtpConfigHash({ ...mockDbConfig, smtpHost: 'other.example.com' });
  assert.notEqual(hash1, hash2);

  // 6. Host policy & SSRF prevention
  assert.equal(validateMailHostPolicy('169.254.169.254', 587, 'smtp').valid, false);
  assert.equal(validateMailHostPolicy('mail.global-hrm.net', 80, 'smtp').valid, false);
  assert.equal(validateMailHostPolicy('mail.global-hrm.net', 587, 'smtp').valid, true);
  delete process.env.EMAIL_ALLOW_PRIVATE_MAIL_HOSTS;
  assert.equal(validateMailHostPolicy('10.0.0.5', 587, 'smtp').valid, false);
  process.env.EMAIL_ALLOW_PRIVATE_MAIL_HOSTS = 'true';
  assert.equal(validateMailHostPolicy('10.0.0.5', 587, 'smtp').valid, true);

  // 7. Unencrypted SMTP blocked in production
  assert.equal(isUnencryptedSmtpAllowed(), false);

  // 8. Sender compatibility check (prevents participant email spoofing)
  assert.equal(
    validateSenderCompatibility({
      fromEmail: 'participant@bank.com.pk',
      smtpUsername: 'noreply@global-hrm.net',
    }).valid,
    false
  );
  assert.equal(
    validateSenderCompatibility({
      fromEmail: 'noreply@global-hrm.net',
      smtpUsername: 'noreply@global-hrm.net',
    }).valid,
    true
  );

  // 9. Template placeholder validation & XSS escaping
  const verif = DEFAULT_EMAIL_TEMPLATES.verification;
  assert.equal(
    validateTemplatePlaceholders({
      requiredPlaceholders: verif.requiredPlaceholders,
      subject: verif.subject,
      bodyHtml: '<p>Missing link</p>',
      bodyText: 'Missing link',
    }).valid,
    false
  );
  const rendered = renderBrandedEmail({
    template: verif,
    variables: {
      ...verif.syntheticData,
      preferred_name: '<script>alert(1)</script>',
    },
  });
  assert.ok(!rendered.html.includes('<script>alert(1)</script>'));
  assert.ok(rendered.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(rendered.text.includes(verif.syntheticData.verification_url));

  // 10. Inbound HTML sanitization blocks scripts, javascript: links, and remote images
  const unsafeInbound =
    '<p>Hello</p><script>evil()</script><img src="https://tracker.evil.com/px.png" /><a href="javascript:alert(1)">Click</a>';
  const safeInbound = sanitizeInboundHtml(unsafeInbound);
  assert.ok(!safeInbound.includes('<script>'));
  assert.ok(!safeInbound.includes('<img'));
  assert.ok(!safeInbound.includes('javascript:'));
  assert.ok(safeInbound.includes('<p>Hello</p>'));
  assert.equal(buildSafeTextPreview('  Line 1\n\nLine 2  '), 'Line 1 Line 2');

  console.log('All 10 Email Settings & Security test groups passed.');
}

runTests();
