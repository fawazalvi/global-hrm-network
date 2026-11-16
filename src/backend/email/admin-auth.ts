import { NextResponse } from 'next/server';
import { auth, type AuthSession } from '@/backend/auth';

export async function requireAdminSession(): Promise<
  { ok: true; session: AuthSession } | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!session || !session.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  if (session.user.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden: Administrator access required.' }, { status: 403 }),
    };
  }
  return { ok: true, session };
}
