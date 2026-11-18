import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/backend/email/admin-auth';
import { testAiApiKey } from '@/backend/ai/keys';

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;

  try {
    const { id } = await context.params;
    const result = await testAiApiKey(id, {
      userId: authCheck.session.user.id,
      email: authCheck.session.user.email,
    });

    if (!result) {
      return NextResponse.json({ error: 'API key not found.' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error testing AI API key:', error);
    return NextResponse.json({ error: 'Failed to test AI API key.' }, { status: 500 });
  }
}
