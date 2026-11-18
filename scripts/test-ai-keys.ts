import assert from 'node:assert/strict';
import { maskApiKey, redactApiKeyError } from '../src/backend/ai/keys';
import { decryptEmailSecret, encryptEmailSecret } from '../src/backend/email/crypto';

console.log('Running AI & API Key unit tests...');

// 1. Key masking
assert.equal(maskApiKey('gsk_1234567890abcdef'), 'gsk_••••cdef');
assert.equal(maskApiKey('short'), '••••rt');

// 2. Error redaction
const secret = 'gsk_superSecretTokenValue987654';
const redacted = redactApiKeyError(
  `Authorization failed with key ${secret} and another gsk_anotherSecret12345`,
  secret
);
assert.ok(!redacted.includes(secret));
assert.ok(!redacted.includes('gsk_anotherSecret12345'));
assert.ok(redacted.includes('[REDACTED'));

// 3. Encryption round-trip using a 32-byte test key in env
const prevKey = process.env.EMAIL_CONFIG_ENCRYPTION_KEY;
process.env.EMAIL_CONFIG_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
try {
  const cipher = encryptEmailSecret(secret);
  assert.ok(cipher.startsWith('v1:'));
  assert.notEqual(cipher, secret);
  const plain = decryptEmailSecret(cipher);
  assert.equal(plain, secret);
} finally {
  if (prevKey === undefined) {
    delete process.env.EMAIL_CONFIG_ENCRYPTION_KEY;
  } else {
    process.env.EMAIL_CONFIG_ENCRYPTION_KEY = prevKey;
  }
}

console.log('All AI & API Key unit tests passed.');
