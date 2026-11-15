import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { auth } from './auth';
import { isDatabaseUnavailableError } from './db';
import { SurveyDomainError } from './survey-service';
import type { AdminActor } from './admin-choices-service';

export async function requireAdminActor(): Promise<
  { actor: AdminActor; errorResponse?: never } | { actor?: never; errorResponse: NextResponse }
> {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string; role?: string } | undefined;

  if (!session || !user) {
    return { errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (user.role !== 'admin') {
    return { errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return {
    actor: {
      userId: user.id || user.email || 'admin',
      email: user.email || 'admin@globalhrm.org',
    },
  };
}

export function revalidateSurveyPaths() {
  try {
    revalidatePath('/surveys/pakistan-banking-map');
    revalidatePath('/api/surveys/pakistan-banking-map');
  } catch {
    // Safe fallback if called outside a Next.js request context
  }
}

export function handleAdminApiError(error: unknown, fallbackMessage: string) {
  if (error instanceof SurveyDomainError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
  }
  if (isDatabaseUnavailableError(error)) {
    return NextResponse.json(
      { error: 'Database is temporarily unavailable. Please try again shortly.' },
      { status: 503 }
    );
  }
  console.error(fallbackMessage, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
