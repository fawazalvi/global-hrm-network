import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { requireAdminSession } from '@/backend/email/admin-auth';
import { EmailCryptoError } from '@/backend/email/crypto';
import { deleteAiApiKey, updateAiApiKey } from '@/backend/ai/keys';

const UpdateAiKeySchema = z.object({
  label: z.string().trim().min(2).max(80).optional(),
  apiKey: z.string().trim().min(8).max(500).optional(),
  defaultModel: z.string().trim().max(120).optional().nullable(),
  baseUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .nullable()
    .refine((v) => !v || /^https?:\/\//i.test(v), 'Base URL must start with http:// or https://'),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;

  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    const parsed = UpdateAiKeySchema.parse(body);

    const updated = await updateAiApiKey(id, parsed, {
      userId: authCheck.session.user.id,
      email: authCheck.session.user.email,
    });

    if (!updated) {
      return NextResponse.json({ error: 'API key not found.' }, { status: 404 });
    }

    return NextResponse.json({ key: updated });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid update payload.' },
        { status: 400 }
      );
    }
    if (error instanceof EmailCryptoError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error updating AI API key:', error);
    return NextResponse.json({ error: 'Failed to update AI API key.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;

  try {
    const { id } = await context.params;
    const deleted = await deleteAiApiKey(id, {
      userId: authCheck.session.user.id,
      email: authCheck.session.user.email,
    });

    if (!deleted) {
      return NextResponse.json({ error: 'API key not found.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting AI API key:', error);
    return NextResponse.json({ error: 'Failed to delete AI API key.' }, { status: 500 });
  }
}
