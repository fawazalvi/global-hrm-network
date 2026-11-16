import { NextResponse } from 'next/server';
import { auth } from '@/backend/auth';
import { pollImapInbox, processEmailOutboxBatch } from '@/backend/email/service';

export async function POST(req: Request) {
  const workerSecret = process.env.EMAIL_WORKER_SECRET;
  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  let authorized = false;
  if (workerSecret && bearerToken && bearerToken === workerSecret) {
    authorized = true;
  } else {
    const session = await auth();
    if (session?.user?.role === 'admin') {
      authorized = true;
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const outbox = await processEmailOutboxBatch(50);
    const imap = await pollImapInbox();
    return NextResponse.json({
      success: true,
      outbox,
      imap,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Internal email worker error:', error);
    return NextResponse.json({ error: error?.message || 'Worker run failed.' }, { status: 500 });
  }
}
