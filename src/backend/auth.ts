import { cookies } from 'next/headers';
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type SessionUser,
} from '@/backend/session';

export interface AuthSession {
  user: SessionUser;
}

export async function auth(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const user = await verifySessionToken(token);
    if (!user) return null;
    return { user };
  } catch {
    return null;
  }
}
