import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { requireAdminSession } from '@/backend/email/admin-auth';
import { EmailCryptoError } from '@/backend/email/crypto';
import { createAiApiKey, listAiApiKeys } from '@/backend/ai/keys';

export const dynamic = 'force-dynamic';

const CreateAiKeySchema = z.object({
  provider: z.enum(['groq', 'openai', 'anthropic', 'gemini', 'custom']).default('groq'),
  label: z.string().trim().min(2, 'Label must be at least 2 characters').max(80),
  apiKey: z.string().trim().min(8, 'API key looks too short').max(500),
  defaultModel: z.string().trim().max(120).optional().nullable(),
  baseUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .nullable()
    .refine((v) => !v || /^https?:\/\//i.test(v), 'Base URL must start with http:// or https://'),
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
});

export async function GET() {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;

  try {
    const data = await listAiApiKeys();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error listing AI API keys:', error);
    return NextResponse.json({ error: 'Failed to load AI API keys.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;

  try {
    const body = await req.json().catch(() => null);
    const parsed = CreateAiKeySchema.parse(body);

    const key = await createAiApiKey(parsed, {
      userId: authCheck.session.user.id,
      email: authCheck.session.user.email,
    });

    return NextResponse.json({ key }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid API key payload.' },
        { status: 400 }
      );
    }
    if (error instanceof EmailCryptoError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error creating AI API key:', error);
    return NextResponse.json({ error: 'Failed to save AI API key.' }, { status: 500 });
  }
}
