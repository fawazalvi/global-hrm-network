import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const PREFIX = 'v1';

export class EmailCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailCryptoError';
  }
}

function parseKey(raw: string | undefined, envName: string): Buffer | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  const b64 = Buffer.from(trimmed, 'base64');
  if (b64.length === 32) {
    return b64;
  }

  throw new EmailCryptoError(
    `${envName} must be a 32-byte key encoded as 64 hex characters or 44-char base64.`
  );
}

function getPrimaryEncryptionKey(): Buffer {
  const key = parseKey(process.env.EMAIL_CONFIG_ENCRYPTION_KEY, 'EMAIL_CONFIG_ENCRYPTION_KEY');
  if (!key) {
    throw new EmailCryptoError(
      'EMAIL_CONFIG_ENCRYPTION_KEY is not configured on this server. Set a 32-byte hex or base64 secret in Coolify environment variables before saving or using mail credentials.'
    );
  }
  return key;
}

export function isEncryptionKeyConfigured(): { configured: boolean; error?: string } {
  try {
    getPrimaryEncryptionKey();
    return { configured: true };
  } catch (err: any) {
    return { configured: false, error: err?.message || 'Encryption key unavailable.' };
  }
}

export function encryptEmailSecret(plaintext: string): string {
  if (!plaintext) {
    throw new EmailCryptoError('Cannot encrypt an empty secret.');
  }
  const key = getPrimaryEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptEmailSecret(ciphertext: string): string {
  if (!ciphertext) {
    throw new EmailCryptoError('Stored credential payload is empty.');
  }
  const parts = ciphertext.split(':');
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new EmailCryptoError('Unsupported encrypted credential format.');
  }

  const [, ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const encryptedData = Buffer.from(dataB64, 'base64');

  const keysToTry: Buffer[] = [getPrimaryEncryptionKey()];
  const prevKey = parseKey(
    process.env.EMAIL_CONFIG_ENCRYPTION_KEY_PREVIOUS,
    'EMAIL_CONFIG_ENCRYPTION_KEY_PREVIOUS'
  );
  if (prevKey) {
    keysToTry.push(prevKey);
  }

  for (const key of keysToTry) {
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      // Try next key if rotating
    }
  }

  throw new EmailCryptoError(
    'Failed to decrypt stored mail credentials. Verify that EMAIL_CONFIG_ENCRYPTION_KEY matches the key used when the credentials were saved.'
  );
}
