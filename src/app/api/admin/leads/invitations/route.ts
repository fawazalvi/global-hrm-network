import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '@/backend/db';
import { requireLeadPermission } from '@/backend/leads/permissions';
import {
  friendlyDeliveryLabel,
  previewOrDispatchInvitations,
  redactTechnicalText,
} from '@/backend/leads/service';
import { resolveSiteOrigin } from '@/backend/survey-email';
import { processEmailOutboxBatch } from '@/backend/email/service';

export const dynamic = 'force-dynamic';

const ComposeInvitesSchema = z.object({
  action: z.enum(['preview', 'send', 'cancel', 'retry_outbox']).default('send'),
  mode: z.enum(['single', 'manual_batch', 'selected_ids', 'all_matching']).optional().default('single'),
  contacts: z
    .array(
      z.object({
        email: z.string().trim(),
        name: z.string().trim().optional(),
        institution: z.string().trim().optional(),
      })
    )
    .max(50)
    .optional(),
  leadIds: z.array(z.string()).max(1000).optional(),
  filters: z.record(z.string(), z.any()).optional(),
  campaignId: z.string().optional(),
  templateType: z
    .enum(['pakistan_launch_invitation', 'survey_invitation'])
    .default('pakistan_launch_invitation'),
  expiryDays: z.coerce.number().int().min(1).max(365).default(14),
  allowResend: z.boolean().default(false),
  queueOnly: z.boolean().optional().default(false),
  outboxId: z.string().optional(),
});

export async function GET(req: Request) {
  const perm = await requireLeadPermission('view_email_logs');
  if (!perm.ok) return perm.response;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = [10, 25, 50, 100].includes(Number(searchParams.get('pageSize')))
      ? Number(searchParams.get('pageSize'))
      : 25;
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    const where: any = {
      emailType: { in: ['pakistan_launch_invitation', 'survey_invitation'] },
    };
    if (status && status !== 'all') where.status = status;
    if (search) where.normalizedRecipient = { contains: search };

    const total = await db.emailOutbox.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);

    const outboxRows = await db.emailOutbox.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        emailType: true,
        templateVersion: true,
        campaignId: true,
        recipientEmail: true,
        normalizedRecipient: true,
        recipientName: true,
        subject: true,
        status: true,
        attemptCount: true,
        maxAttempts: true,
        smtpResponse: true,
        lastError: true,
        sentAt: true,
        createdAt: true,
      },
    });

    const outboxIds = outboxRows.map((o) => o.id);
    const normalizedEmails = Array.from(new Set(outboxRows.map((o) => o.normalizedRecipient)));

    const [invites, leads, verifiedSubs] = await Promise.all([
      outboxIds.length
        ? db.surveyLeadInvite.findMany({
            where: { outboxId: { in: outboxIds } },
          })
        : [],
      normalizedEmails.length
        ? db.leadContact.findMany({
            where: { normalizedEmail: { in: normalizedEmails } },
            include: { institution: { select: { name: true } } },
          })
        : [],
      normalizedEmails.length
        ? db.surveySubmission.findMany({
            where: { normalizedEmail: { in: normalizedEmails }, status: 'verified' },
            select: { normalizedEmail: true, verifiedAt: true },
          })
        : [],
    ]);

    const inviteByOutbox = new Map(invites.map((i) => [i.outboxId, i]));
    const leadByEmail = new Map(leads.map((l) => [l.normalizedEmail, l]));
    const verifiedMap = new Map(verifiedSubs.map((v) => [v.normalizedEmail, v]));
    const now = new Date();

    const items = outboxRows.map((row) => {
      const inv = inviteByOutbox.get(row.id) || null;
      const lead = leadByEmail.get(row.normalizedRecipient) || null;
      const verified = verifiedMap.get(row.normalizedRecipient) || null;

      return {
        id: row.id,
        leadId: lead?.id || inv?.leadId || null,
        emailType: row.emailType,
        templateVersion: row.templateVersion,
        campaignId: row.campaignId,
        recipientEmail: row.recipientEmail,
        recipientName: row.recipientName || lead?.fullName || null,
        institutionName: lead?.institution?.name || lead?.institutionName || null,
        subject: row.subject,
        status: row.status,
        friendlyStatus: friendlyDeliveryLabel(row.status),
        attemptCount: row.attemptCount,
        maxAttempts: row.maxAttempts,
        smtpResponse: redactTechnicalText(row.smtpResponse),
        lastError: redactTechnicalText(row.lastError),
        sentAt: row.sentAt ? row.sentAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
        visitStatus: inv?.openedAt
          ? { visited: true, openedAt: inv.openedAt.toISOString(), openCount: inv.openCount }
          : { visited: false, openedAt: null, openCount: 0 },
        expiry: inv
          ? { expiresAt: inv.expiresAt.toISOString(), isExpired: inv.expiresAt < now }
          : null,
        completionStatus: verified
          ? 'Verified & Completed'
          : inv?.completedAt
            ? 'Submitted'
            : 'Pending',
      };
    });

    return NextResponse.json({
      items,
      total,
      page: safePage,
      pageSize,
      totalPages,
    });
  } catch (error: any) {
    console.error('Error fetching invitations log:', error);
    return NextResponse.json({ error: 'Failed to load invitations activity.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const perm = await requireLeadPermission('send_invitations');
  if (!perm.ok) return perm.response;
  const { session } = perm;

  try {
    const body = await req.json().catch(() => null);
    const parsed = ComposeInvitesSchema.parse(body);

    if (parsed.action === 'cancel') {
      if (!parsed.outboxId) {
        return NextResponse.json({ error: 'outboxId is required.' }, { status: 400 });
      }
      const updated = await db.emailOutbox.updateMany({
        where: {
          id: parsed.outboxId,
          status: { in: ['queued', 'temporarily_failed'] },
        },
        data: {
          status: 'cancelled',
          lockedAt: null,
          lockedBy: null,
          lastError: `Cancelled by ${session.user.email}.`,
        },
      });
      if (updated.count === 0) {
        return NextResponse.json(
          { error: 'Only queued or temporarily failed messages can be cancelled.' },
          { status: 409 }
        );
      }
      await db.leadAuditLog.create({
        data: {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'invite_cancelled',
          summary: `Cancelled queued outbox message ${parsed.outboxId}.`,
        },
      });
      return NextResponse.json({ success: true });
    }

    if (parsed.action === 'retry_outbox') {
      if (!parsed.outboxId) {
        return NextResponse.json({ error: 'outboxId is required.' }, { status: 400 });
      }
      const updated = await db.emailOutbox.updateMany({
        where: {
          id: parsed.outboxId,
          status: { in: ['temporarily_failed', 'permanently_failed'] },
        },
        data: {
          status: 'queued',
          nextAttemptAt: new Date(),
          lockedAt: null,
          lockedBy: null,
        },
      });
      if (updated.count === 0) {
        return NextResponse.json({ error: 'Message is not eligible for retry.' }, { status: 409 });
      }
      await processEmailOutboxBatch(10);
      return NextResponse.json({ success: true });
    }

    const origin = resolveSiteOrigin(req);
    const outcome = await previewOrDispatchInvitations({
      mode: parsed.mode,
      contacts: parsed.contacts,
      leadIds: parsed.leadIds,
      filters: parsed.filters,
      campaignId: parsed.campaignId,
      templateType: parsed.templateType,
      expiryDays: parsed.expiryDays,
      allowResend: parsed.allowResend,
      dryRun: parsed.action === 'preview',
      queueOnly: parsed.queueOnly,
      origin,
      actor: { id: session.user.id, email: session.user.email },
    });

    return NextResponse.json({ success: true, ...outcome });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation failed.' },
        { status: 400 }
      );
    }
    console.error('Error in invitations POST:', error);
    return NextResponse.json({ error: error?.message || 'Invitation operation failed.' }, { status: 500 });
  }
}
