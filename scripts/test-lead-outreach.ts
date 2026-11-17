import assert from 'node:assert/strict';
import {
  friendlyDeliveryLabel,
  parseTags,
  redactTechnicalText,
  sanitizeCsvCell,
} from '../src/backend/leads/service';
import { normalizeEmail } from '../src/backend/survey-validation';

function runTests() {
  console.log('Running Lead & Outreach Management unit tests (no real emails sent)...');

  // 1. Email normalization preserves dots and + suffixes
  assert.equal(normalizeEmail('  Fawaz.Alvi+hr@Global-HRM.net  '), 'fawaz.alvi+hr@global-hrm.net');
  assert.notEqual(
    normalizeEmail('first.last@gmail.com'),
    normalizeEmail('firstlast@gmail.com')
  );

  // 2. CSV formula injection protection
  assert.equal(sanitizeCsvCell('=CMD("calc")'), `"'=CMD(""calc"")"`);
  assert.equal(sanitizeCsvCell('+1+1'), `'+1+1`);
  assert.equal(sanitizeCsvCell('-100'), `'-100`);
  assert.equal(sanitizeCsvCell('@SUM(A1:A2)'), `'@SUM(A1:A2)`);
  assert.equal(sanitizeCsvCell('Normal Name'), 'Normal Name');

  // 3. Technical log redaction
  const redacted = redactTechnicalText(
    'Failed sending https://global-hrm.net?invite=secret123&token=abc postgresql://user:pass@host/db'
  );
  assert.ok(redacted && !redacted.includes('secret123'));
  assert.ok(!redacted.includes('user:pass@host'));
  assert.ok(redacted.includes('invite=[REDACTED]'));
  assert.ok(redacted.includes('postgresql://[REDACTED]'));

  // 4. Honest delivery labels (accepted_by_smtp != Delivered)
  assert.equal(friendlyDeliveryLabel('accepted_by_smtp'), 'Accepted by mail server');
  assert.equal(friendlyDeliveryLabel('delivered'), 'Delivered');
  assert.equal(friendlyDeliveryLabel('queued'), 'Queued');
  assert.equal(friendlyDeliveryLabel('cancelled'), 'Cancelled');
  assert.equal(friendlyDeliveryLabel('permanently_failed'), 'Failed');

  // 5. Tag parsing
  assert.deepEqual(parseTags('["tier-1", "hr"]'), ['tier-1', 'hr']);
  assert.deepEqual(parseTags('invalid-json'), []);

  console.log('All Lead & Outreach unit tests passed.');
}

runTests();
