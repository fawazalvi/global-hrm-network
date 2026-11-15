/**
 * Server-side environment configuration and validation.
 * Never import this module from Client Components or expose its values to the browser.
 */

export interface DatabaseConfigStatus {
  configured: boolean;
  protocolValid: boolean;
  error?: string;
}

export function validateDatabaseEnv(): DatabaseConfigStatus {
  const url = process.env.DATABASE_URL;
  if (!url || !url.trim()) {
    return {
      configured: false,
      protocolValid: false,
      error: 'DATABASE_URL environment variable is not configured.',
    };
  }

  const trimmed = url.trim();
  const isPostgres =
    trimmed.startsWith('postgresql://') || trimmed.startsWith('postgres://');

  if (!isPostgres) {
    return {
      configured: true,
      protocolValid: false,
      error: 'DATABASE_URL must use a postgresql:// or postgres:// scheme.',
    };
  }

  return {
    configured: true,
    protocolValid: true,
  };
}

/**
 * Redacts credentials and host details from any error message or string
 * so secrets are never leaked into logs or API responses.
 */
export function redactConnectionDetails(input: string): string {
  return input
    .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, 'postgresql://[REDACTED]')
    .replace(/password=[^\s;&'"]+/gi, 'password=[REDACTED]');
}
