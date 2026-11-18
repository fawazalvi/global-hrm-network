import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { requireAdminSession } from '@/backend/email/admin-auth';
import {
  getActiveAiKeyForProvider,
  getDecryptedAiKeyById,
  redactApiKeyError,
} from '@/backend/ai/keys';

const ChatTestSchema = z.object({
  keyId: z.string().trim().optional(),
  model: z.string().trim().max(120).optional(),
  systemPrompt: z.string().trim().max(2000).optional(),
  prompt: z.string().trim().min(1, 'Prompt is required').max(4000),
  temperature: z.coerce.number().min(0).max(2).optional().default(0.3),
  maxTokens: z.coerce.number().int().min(16).max(4096).optional().default(512),
});

export async function POST(req: Request) {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;

  let resolvedSecret = '';
  try {
    const body = await req.json().catch(() => null);
    const parsed = ChatTestSchema.parse(body);

    const keyConfig =
      parsed.keyId && parsed.keyId !== 'auto'
        ? await getDecryptedAiKeyById(parsed.keyId)
        : await getActiveAiKeyForProvider('groq');

    if (!keyConfig) {
      return NextResponse.json(
        {
          error:
            'No active Groq API key found. Add a Groq key under AI & API Keys first.',
        },
        { status: 400 }
      );
    }

    if ('isActive' in keyConfig && !keyConfig.isActive) {
      return NextResponse.json(
        { error: `Selected key "${keyConfig.label}" is currently disabled.` },
        { status: 400 }
      );
    }

    resolvedSecret = keyConfig.apiKey;
    const baseUrl = keyConfig.baseUrl.replace(/\/+$/, '');
    const model = parsed.model || keyConfig.defaultModel || 'llama-3.3-70b-versatile';

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (parsed.systemPrompt) {
      messages.push({ role: 'system', content: parsed.systemPrompt });
    }
    messages.push({ role: 'user', content: parsed.prompt });

    const startedAt = Date.now();
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resolvedSecret}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: parsed.temperature,
        max_tokens: parsed.maxTokens,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    const latencyMs = Date.now() - startedAt;

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const cleanErr = redactApiKeyError(
        `Groq API HTTP ${res.status}: ${errText || res.statusText}`,
        resolvedSecret
      );
      return NextResponse.json({ error: cleanErr, latencyMs }, { status: 502 });
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content ?? '';

    return NextResponse.json({
      ok: true,
      reply,
      model: data?.model || model,
      usage: data?.usage || null,
      latencyMs,
      keyLabel: keyConfig.label,
      keyPreview: keyConfig.keyPreview,
      finishReason: data?.choices?.[0]?.finish_reason || null,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid test request.' },
        { status: 400 }
      );
    }
    const cleanMsg = redactApiKeyError(
      error instanceof Error ? error.message : 'Groq communication failed.',
      resolvedSecret
    );
    return NextResponse.json({ error: cleanMsg }, { status: 500 });
  }
}
