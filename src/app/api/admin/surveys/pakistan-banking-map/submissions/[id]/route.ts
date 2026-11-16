import { NextResponse } from 'next/server';
import { auth } from '@/backend/auth';
import { db, isDatabaseUnavailableError } from '@/backend/db';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Submission ID is required.' }, { status: 400 });
    }

    const existing = await db.surveySubmission.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Survey submission not found.' }, { status: 404 });
    }

    await db.surveySubmission.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        { error: 'Database is temporarily unavailable. Please try again shortly.' },
        { status: 503 }
      );
    }
    console.error('Error deleting survey submission:', error);
    return NextResponse.json({ error: 'Unable to delete survey submission.' }, { status: 500 });
  }
}
