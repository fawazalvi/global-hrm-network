import { db } from '@/backend/db';
import {
  decryptEmailSecret,
  encryptEmailSecret,
  isEncryptionKeyConfigured,
} from '@/backend/email/crypto';

export type AiProviderId = 'groq' | 'openai' | 'anthropic' | 'gemini' | 'custom';

export interface ProviderMeta {
  id: AiProviderId;
  name: string;
  defaultBaseUrl: string;
  defaultModel: string;
  keyPrefixHint: string;
  suggestedModels: string[];
}

export const AI_PROVIDERS: Record<AiProviderId, ProviderMeta> = {
  groq: {
    id: 'groq',
    name: 'Groq',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    keyPrefixHint: 'gsk_...',
    suggestedModels: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'deepseek-r1-distill-llama-70b',
      'qwen-qwq-32b',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    keyPrefixHint: 'sk-...',
    suggestedModels: ['gpt-4o-mini', 'gpt-4o', 'o3-mini'],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-latest',
    keyPrefixHint: 'sk-ant-...',
    suggestedModels: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    keyPrefixHint: 'AIza...',
    suggestedModels: ['gemini-2.0-flash', 'gemini-1.5-pro'],
  },
  custom: {
    id: 'custom',
    name: 'Custom OpenAI-Compatible',
    defaultBaseUrl: '',
    defaultModel: '',
    keyPrefixHint: 'sk-...',
    suggestedModels: [],
  },
};

export interface ActorContext {
  userId?: string | null;
  email?: string | null;
}

export interface RedactedAiApiKey {
  id: string;
  provider: string;
  label: string;
  keyPreview: string;
  defaultModel: string | null;
  baseUrl: string | null;
  isActive: boolean;
  isDefault: boolean;
  lastTestedAt: Date | null;
  lastTestStatus: string | null;
  lastTestMessage: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function maskApiKey(rawKey: string): string {
  const trimmed = rawKey.trim();
  if (trimmed.length >= 10) {
    return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
  }
  if (trimmed.length >= 4) {
    return `••••${trimmed.slice(-2)}`;
  }
  return '••••';
}

export function redactApiKeyError(message: string, secret?: string): string {
  let out = message || 'Unknown error';
  if (secret && secret.length > 4) {
    out = out.split(secret).join('[REDACTED_KEY]');
  }
  return out
    .replace(/gsk_[A-Za-z0-9_-]{8,}/g, 'gsk_[REDACTED]')
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-[REDACTED]')
    .replace(/AIza[A-Za-z0-9_-]{8,}/g, 'AIza[REDACTED]')
    .slice(0, 500);
}

function toRedacted(row: {
  id: string;
  provider: string;
  label: string;
  keyPreview: string;
  defaultModel: string | null;
  baseUrl: string | null;
  isActive: boolean;
  isDefault: boolean;
  lastTestedAt: Date | null;
  lastTestStatus: string | null;
  lastTestMessage: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): RedactedAiApiKey {
  return {
    id: row.id,
    provider: row.provider,
    label: row.label,
    keyPreview: row.keyPreview,
    defaultModel: row.defaultModel,
    baseUrl: row.baseUrl,
    isActive: row.isActive,
    isDefault: row.isDefault,
    lastTestedAt: row.lastTestedAt,
    lastTestStatus: row.lastTestStatus,
    lastTestMessage: row.lastTestMessage,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listAiApiKeys() {
  const [keys, auditLogs] = await Promise.all([
    db.aiApiKey.findMany({
      orderBy: [{ provider: 'asc' }, { isDefault: 'desc' }, { createdAt: 'desc' }],
    }),
    db.aiApiKeyAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ]);

  const enc = isEncryptionKeyConfigured();

  return {
    keys: keys.map(toRedacted),
    auditLogs,
    encryptionKeyConfigured: enc.configured,
    encryptionKeyError: enc.error || null,
    providers: Object.values(AI_PROVIDERS),
  };
}

export async function createAiApiKey(
  input: {
    provider: AiProviderId;
    label: string;
    apiKey: string;
    defaultModel?: string | null;
    baseUrl?: string | null;
    isActive?: boolean;
    isDefault?: boolean;
  },
  actor: ActorContext
): Promise<RedactedAiApiKey> {
  const trimmedKey = input.apiKey.trim();
  const encryptedKey = encryptEmailSecret(trimmedKey);
  const keyPreview = maskApiKey(trimmedKey);
  const meta = AI_PROVIDERS[input.provider] || AI_PROVIDERS.custom;
  const normalizedBaseUrl = input.baseUrl?.trim() || meta.defaultBaseUrl || null;
  const normalizedModel = input.defaultModel?.trim() || meta.defaultModel || null;
  const isActive = input.isActive ?? true;

  const created = await db.$transaction(async (tx) => {
    const existingCount = await tx.aiApiKey.count({
      where: { provider: input.provider },
    });
    const shouldBeDefault = isActive && (Boolean(input.isDefault) || existingCount === 0);

    if (shouldBeDefault) {
      await tx.aiApiKey.updateMany({
        where: { provider: input.provider, isDefault: true },
        data: { isDefault: false },
      });
    }

    const row = await tx.aiApiKey.create({
      data: {
        provider: input.provider,
        label: input.label.trim(),
        encryptedKey,
        keyPreview,
        defaultModel: normalizedModel,
        baseUrl: normalizedBaseUrl,
        isActive,
        isDefault: shouldBeDefault,
        createdByUserId: actor.userId || null,
        updatedByUserId: actor.userId || null,
      },
    });

    await tx.aiApiKeyAuditLog.create({
      data: {
        apiKeyId: row.id,
        provider: row.provider,
        label: row.label,
        actorUserId: actor.userId || null,
        actorEmail: actor.email || null,
        action: 'created',
        summary: `Added ${row.provider} key "${row.label}" (${row.keyPreview})${shouldBeDefault ? ' as default' : ''}.`,
      },
    });

    return row;
  });

  return toRedacted(created);
}

export async function updateAiApiKey(
  id: string,
  input: {
    label?: string;
    apiKey?: string;
    defaultModel?: string | null;
    baseUrl?: string | null;
    isActive?: boolean;
    isDefault?: boolean;
  },
  actor: ActorContext
): Promise<RedactedAiApiKey | null> {
  const existing = await db.aiApiKey.findUnique({ where: { id } });
  if (!existing) return null;

  const nextActive = input.isActive ?? existing.isActive;
  const nextDefault = nextActive ? (input.isDefault ?? existing.isDefault) : false;
  const rotatedKey = input.apiKey?.trim();

  const updated = await db.$transaction(async (tx) => {
    if (nextDefault) {
      await tx.aiApiKey.updateMany({
        where: { provider: existing.provider, id: { not: existing.id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    const data: Record<string, unknown> = {
      label: input.label !== undefined ? input.label.trim() : existing.label,
      defaultModel:
        input.defaultModel !== undefined
          ? input.defaultModel?.trim() || null
          : existing.defaultModel,
      baseUrl:
        input.baseUrl !== undefined ? input.baseUrl?.trim() || null : existing.baseUrl,
      isActive: nextActive,
      isDefault: nextDefault,
      updatedByUserId: actor.userId || null,
    };

    if (rotatedKey) {
      data.encryptedKey = encryptEmailSecret(rotatedKey);
      data.keyPreview = maskApiKey(rotatedKey);
      data.lastTestedAt = null;
      data.lastTestStatus = null;
      data.lastTestMessage = null;
    }

    const row = await tx.aiApiKey.update({
      where: { id },
      data,
    });

    let action = 'updated';
    let summary = `Updated key "${row.label}".`;
    if (rotatedKey) {
      action = 'rotated';
      summary = `Rotated secret for "${row.label}" (${row.keyPreview}).`;
    } else if (input.isDefault === true && !existing.isDefault) {
      action = 'set_default';
      summary = `Set "${row.label}" as default ${row.provider} key.`;
    } else if (input.isActive !== undefined && input.isActive !== existing.isActive) {
      action = input.isActive ? 'activated' : 'deactivated';
      summary = `${input.isActive ? 'Activated' : 'Deactivated'} "${row.label}".`;
    }

    await tx.aiApiKeyAuditLog.create({
      data: {
        apiKeyId: row.id,
        provider: row.provider,
        label: row.label,
        actorUserId: actor.userId || null,
        actorEmail: actor.email || null,
        action,
        summary,
      },
    });

    return row;
  });

  return toRedacted(updated);
}

export async function deleteAiApiKey(id: string, actor: ActorContext): Promise<boolean> {
  const existing = await db.aiApiKey.findUnique({ where: { id } });
  if (!existing) return false;

  await db.$transaction(async (tx) => {
    await tx.aiApiKeyAuditLog.create({
      data: {
        apiKeyId: null,
        provider: existing.provider,
        label: existing.label,
        actorUserId: actor.userId || null,
        actorEmail: actor.email || null,
        action: 'deleted',
        summary: `Deleted ${existing.provider} key "${existing.label}" (${existing.keyPreview}).`,
      },
    });

    await tx.aiApiKey.delete({ where: { id } });
  });

  return true;
}

export async function testAiApiKey(
  id: string,
  actor: ActorContext
): Promise<{
  ok: boolean;
  status: 'ok' | 'error';
  message: string;
  models: string[];
  key: RedactedAiApiKey;
} | null> {
  const existing = await db.aiApiKey.findUnique({ where: { id } });
  if (!existing) return null;

  let secret = '';
  let status: 'ok' | 'error' = 'error';
  let message = '';
  let models: string[] = [];

  try {
    secret = decryptEmailSecret(existing.encryptedKey);
    const meta = AI_PROVIDERS[existing.provider as AiProviderId] || AI_PROVIDERS.custom;
    const baseUrl = (existing.baseUrl || meta.defaultBaseUrl || '').replace(/\/+$/, '');

    if (!baseUrl) {
      throw new Error('Base URL is required to test this provider.');
    }

    let url = `${baseUrl}/models`;
    const headers: Record<string, string> = { Accept: 'application/json' };

    if (existing.provider === 'anthropic') {
      headers['x-api-key'] = secret;
      headers['anthropic-version'] = '2023-06-01';
    } else if (existing.provider === 'gemini') {
      url = `${baseUrl}/models?key=${encodeURIComponent(secret)}`;
    } else {
      headers['Authorization'] = `Bearer ${secret}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 200) || res.statusText}`);
    }

    const payload = await res.json().catch(() => ({}));
    if (Array.isArray(payload?.data)) {
      models = payload.data
        .map((m: { id?: string }) => m?.id)
        .filter((m: unknown): m is string => typeof m === 'string')
        .sort()
        .slice(0, 30);
    } else if (Array.isArray(payload?.models)) {
      models = payload.models
        .map((m: { name?: string }) => m?.name?.replace(/^models\//, ''))
        .filter((m: unknown): m is string => typeof m === 'string')
        .sort()
        .slice(0, 30);
    }

    status = 'ok';
    message =
      models.length > 0
        ? `Connected (${models.length} models available)`
        : 'Connected successfully';
  } catch (err: unknown) {
    status = 'error';
    const rawMsg = err instanceof Error ? err.message : 'Connection test failed';
    message = redactApiKeyError(rawMsg, secret);
  }

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.aiApiKey.update({
      where: { id },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: status,
        lastTestMessage: message,
      },
    });

    await tx.aiApiKeyAuditLog.create({
      data: {
        apiKeyId: row.id,
        provider: row.provider,
        label: row.label,
        actorUserId: actor.userId || null,
        actorEmail: actor.email || null,
        action: 'tested',
        summary: `Tested "${row.label}": ${status === 'ok' ? 'OK' : 'Failed'} — ${message}`,
      },
    });

    return row;
  });

  return {
    ok: status === 'ok',
    status,
    message,
    models,
    key: toRedacted(updated),
  };
}

/**
 * Server-only helper for application AI routes to retrieve the active API key
 * for a provider (defaulting to Groq). Falls back to GROQ_API_KEY env var if
 * no database key is stored yet.
 */
export async function getActiveAiKeyForProvider(provider: AiProviderId = 'groq'): Promise<{
  id: string | null;
  label: string;
  keyPreview: string;
  provider: string;
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
} | null> {
  const row = await db.aiApiKey.findFirst({
    where: { provider, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  const meta = AI_PROVIDERS[provider] || AI_PROVIDERS.custom;

  if (row) {
    const apiKey = decryptEmailSecret(row.encryptedKey);
    db.aiApiKey
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return {
      id: row.id,
      label: row.label,
      keyPreview: row.keyPreview,
      provider: row.provider,
      apiKey,
      baseUrl: row.baseUrl || meta.defaultBaseUrl,
      defaultModel: row.defaultModel || meta.defaultModel,
    };
  }

  if (provider === 'groq' && process.env.GROQ_API_KEY?.trim()) {
    const envKey = process.env.GROQ_API_KEY.trim();
    return {
      id: null,
      label: 'GROQ_API_KEY (Environment)',
      keyPreview: maskApiKey(envKey),
      provider: 'groq',
      apiKey: envKey,
      baseUrl: meta.defaultBaseUrl,
      defaultModel: meta.defaultModel,
    };
  }

  return null;
}

export async function getDecryptedAiKeyById(id: string): Promise<{
  id: string;
  label: string;
  keyPreview: string;
  provider: string;
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  isActive: boolean;
} | null> {
  const row = await db.aiApiKey.findUnique({ where: { id } });
  if (!row) return null;
  const meta = AI_PROVIDERS[row.provider as AiProviderId] || AI_PROVIDERS.custom;
  const apiKey = decryptEmailSecret(row.encryptedKey);

  db.aiApiKey
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return {
    id: row.id,
    label: row.label,
    keyPreview: row.keyPreview,
    provider: row.provider,
    apiKey,
    baseUrl: row.baseUrl || meta.defaultBaseUrl,
    defaultModel: row.defaultModel || meta.defaultModel,
    isActive: row.isActive,
  };
}
