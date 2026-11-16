import { NextResponse } from 'next/server';
import { db } from '@/backend/db';
import { requireAdminSession } from '@/backend/email/admin-auth';
import { pollImapInbox, processEmailOutboxBatch } from '@/backend/email/service';

export async function GET(req: Request) {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status')?.trim() || '';
    const emailType = searchParams.get('emailType')?.trim() || '';
    const recipient = searchParams.get('recipient')?.trim().toLowerCase() || '';
    const campaignId = searchParams.get('campaignId')?.trim() || '';
    const dateFrom = searchParams.get('dateFrom')?.trim() || '';
    const dateTo = searchParams.get('dateTo')?.trim() || '';

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (emailType && emailType !== 'all') where.emailType = emailType;
    if (recipient) where.normalizedRecipient = { contains: recipient };
    if (campaignId && campaignId !== 'all') where.campaignId = campaignId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [outboxLogs, inboundLogs, campaigns, imapCursors] = await Promise.all([
      db.emailOutbox.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          emailType: true,
          campaignId: true,
          participantId: true,
          recipientEmail: true,
          recipientName: true,
          fromAddress: true,
          subject: true,
          status: true,
          attemptCount: true,
          maxAttempts: true,
          messageId: true,
          smtpResponse: true,
          lastError: true,
          containsSensitiveLink: true,
          sentAt: true,
          deliveredAt: true,
          createdAt: true,
        },
      }),
      db.inboundEmailMessage.findMany({
        orderBy: { receivedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          folder: true,
          uid: true,
          messageId: true,
          inReplyTo: true,
          referencesHeader: true,
          fromAddress: true,
          fromName: true,
          toAddress: true,
          subject: true,
          receivedAt: true,
          processingStatus: true,
          textPreview: true,
          sanitizedHtml: true,
          attachmentMetadataJson: true,
          sizeBytes: true,
          relatedOutboxId: true,
          relatedParticipantId: true,
        },
      }),
      db.surveyCampaign.findMany({
        select: { id: true, title: true, slug: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.imapMailboxCursor.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      outboxLogs,
      inboundLogs,
      campaigns,
      imapCursors: imapCursors.map((c) => ({
        ...c,
        uidValidity: c.uidValidity ? c.uidValidity.toString() : null,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching email logs:', error);
    return NextResponse.json({ error: 'Failed to load email logs.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;

  try {
    const body = await req.json().catch(() => null);
    const action = body?.action;

    if (action === 'process_queue') {
      const result = await processEmailOutboxBatch(25);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'poll_imap') {
      const result = await pollImapInbox();
      return NextResponse.json({ success: !result.reason || Boolean(result.skipped), result });
    }

    return NextResponse.json({ error: 'Unknown log action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error executing email worker action:', error);
    return NextResponse.json({ error: 'Worker action failed.' }, { status: 500 });
  }
}
