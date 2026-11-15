import { PrismaClient, Prisma } from '@prisma/client';
import { redactConnectionDetails, validateDatabaseEnv } from './env';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

export default db;

export interface DatabaseHealthResult {
  ok: boolean;
  latencyMs?: number;
  errorCode?: string;
  error?: string;
}

/**
 * Runs a harmless read-only query (`SELECT 1`) to verify database connectivity.
 * Never exposes credentials or raw SQL internals in returned diagnostics.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const envStatus = validateDatabaseEnv();
  if (!envStatus.configured || !envStatus.protocolValid) {
    return {
      ok: false,
      errorCode: 'CONFIG_ERROR',
      error: envStatus.error || 'Database configuration is invalid.',
    };
  }

  const startedAt = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startedAt;
    if (err instanceof Prisma.PrismaClientInitializationError) {
      return {
        ok: false,
        latencyMs,
        errorCode: err.errorCode || 'DB_INIT_ERROR',
        error: 'Database server is unreachable or failed to initialize.',
      };
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        ok: false,
        latencyMs,
        errorCode: err.code,
        error: 'Database query failed.',
      };
    }
    const rawMsg = err instanceof Error ? err.message : 'Unknown database error';
    console.error('Database health check failed:', redactConnectionDetails(rawMsg));
    return {
      ok: false,
      latencyMs,
      errorCode: 'DB_UNAVAILABLE',
      error: 'Database connection check failed.',
    };
  }
}

/**
 * Identifies temporary database unavailability errors so route handlers can
 * return HTTP 503 with a safe, user-friendly message instead of crashing.
 */
export function isDatabaseUnavailableError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (err instanceof Prisma.PrismaClientRustPanicError) {
    return true;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P1001: Can't reach database server; P1002: Timed out; P1008: Operations timed out; P1017: Server closed connection
    return ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(err.code);
  }
  return false;
}
