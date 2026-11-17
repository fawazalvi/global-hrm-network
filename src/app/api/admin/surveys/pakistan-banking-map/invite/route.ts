import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '@/backend/db';
import { requireAdminSession } from '@/backend/email/admin-auth';
import { enqueueAndSendEmail } from '@/backend/email/service';
import { resolveSiteOrigin } from '@/backend/survey-email';
import { PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG } from '@/backend/survey-service';
import { normalizeEmail } from '@/backend/survey-validation';

const LeadContactSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  name: z.string().trim().max(120).optional().default(''),
  institution: z.string().trim().max(160).optional().default(''),
});

const SendLeadInvitesSchema = z.object({
  templateType: z
    .enum(['pakistan_launch_invitation', 'survey_invitation'])
    .default('pakistan_launch_invitation'),
  allowResend: z.boolean().optional().default(false),
  expiryDays: z.coerce.number().int().min(1).max(365).default(14),
  contacts: z
    .array(LeadContactSchema)
    .min(1, 'At least one contact is required.')
    .max(50, 'Maximum 50 contacts per batch.'),
});

function hashInviteToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function GET() {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;

  try {
    const [campaign, recentOutbox, leadInvites] = await Promise.all([
      db.surveyCampaign.findUnique({
        where: { slug: PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG },
        select: { id: true, slug: true, title: true, status: true },
      }),
      db.emailOutbox.findMany({
        where: {
          emailType: { in: ['pakistan_launch_invitation', 'survey_invitation'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          emailType: true,
          recipientEmail: true,
          recipientName: true,
          status: true,
          lastError: true,
          smtpResponse: true,
          sentAt: true,
          createdAt: true,
        },
      }),
      db.surveyLeadInvite.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          outboxId: true,
          normalizedRecipient: true,
          expiresAt: true,
          openedAt: true,
          lastOpenedAt: true,
          openCount: true,
          completedAt: true,
          createdAt: true,
        },
      }),
    ]);

    const inviteByOutbox = new Map<string, (typeof leadInvites)[number]>();
    for (const inv of leadInvites) {
      if (inv.outboxId && !inviteByOutbox.has(inv.outboxId)) {
        inviteByOutbox.set(inv.outboxId, inv);
      }
    }

    const recentInvites = recentOutbox.map((row) => {
      const tracked = inviteByOutbox.get(row.id) || null;
      return {
        ...row,
        tracking: tracked
          ? {
              expiresAt: tracked.expiresAt.toISOString(),
              isExpired: tracked.expiresAt < new Date(),
              openedAt: tracked.openedAt ? tracked.openedAt.toISOString() : null,
              lastOpenedAt: tracked.lastOpenedAt ? tracked.lastOpenedAt.toISOString() : null,
              openCount: tracked.openCount,
              completedAt: tracked.completedAt ? tracked.completedAt.toISOString() : null,
            }
          : null,
      };
    });

    return NextResponse.json({ campaign, recentInvites });
  } catch (error: any) {
    console.error('Error fetching lead invites:', error);
    return NextResponse.json({ error: 'Failed to load invitation history.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;

  try {
    const body = await req.json().catch(() => null);
    const parsed = SendLeadInvitesSchema.parse(body);

    const campaign = await db.surveyCampaign.findUnique({
      where: { slug: PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG },
      select: { id: true, slug: true, title: true, status: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Survey campaign not found.' }, { status: 404 });
    }

    const origin = resolveSiteOrigin(req);
    const baseSurveyUrl = `${origin}/surveys/pakistan-banking-map`;
    const expiresAt = new Date(Date.now() + parsed.expiryDays * 86_400_000);

    const seen = new Set<string>();
    const results: Array<{
      email: string;
      status: string;
      success: boolean;
      message: string;
    }> = [];

    for (const contact of parsed.contacts) {
      const normalized = normalizeEmail(contact.email);
      if (seen.has(normalized)) {
        results.push({
          email: contact.email,
          status: 'duplicate_in_batch',
          success: false,
          message: 'Duplicate email in this batch.',
        });
        continue;
      }
      seen.add(normalized);

      const alreadyVerified = await db.surveySubmission.findFirst({
        where: {
          campaignId: campaign.id,
          normalizedEmail: normalized,
          status: 'verified',
        },
        select: { id: true },
      });

      if (alreadyVerified) {
        results.push({
          email: contact.email,
          status: 'already_completed',
          success: false,
          message: 'Participant has already completed and verified this survey.',
        });
        continue;
      }

      const rawToken = crypto.randomBytes(24).toString('base64url');
      const tokenHash = hashInviteToken(rawToken);
      const trackedSurveyUrl = `${baseSurveyUrl}?invite=${encodeURIComponent(rawToken)}`;
      const unsubscribeUrl = `${baseSurveyUrl}?optOut=${encodeURIComponent(contact.email.trim())}`;

      const baseKey = `admin-lead-invite:${campaign.id}:${parsed.templateType}:${normalized}`;
      const businessKey = parsed.allowResend ? `${baseKey}:${Date.now()}` : baseKey;

      if (!parsed.allowResend) {
        await db.emailOutbox.deleteMany({
          where: {
            businessKey: baseKey,
            status: 'permanently_failed',
          },
        });
      }

      const dispatch = await enqueueAndSendEmail({
        businessKey,
        emailType: parsed.templateType,
        recipientEmail: contact.email.trim(),
        recipientName: contact.name?.trim() || '',
        campaignId: campaign.id,
        containsSensitiveLink: true,
        payloadExpiresAt: expiresAt,
        templateData: {
          preferred_name: contact.name?.trim() || '',
          institution_name: contact.institution?.trim() || '',
          survey_title: campaign.title,
          survey_url: trackedSurveyUrl,
          unsubscribe_url: unsubscribeUrl,
          expiry_minutes: String(parsed.expiryDays * 1440),
        },
      });

      if (dispatch.outboxId) {
        await db.surveyLeadInvite.create({
          data: {
            campaignId: campaign.id,
            outboxId: dispatch.outboxId,
            recipientEmail: contact.email.trim(),
            normalizedRecipient: normalized,
            recipientName: contact.name?.trim() || null,
            tokenHash,
            expiresAt,
          },
        });
      }

      results.push({
        email: contact.email,
        status: dispatch.status,
        success: dispatch.success,
        message: dispatch.message,
      });
    }

    return NextResponse.json({
      success: true,
      surveyUrl: baseSurveyUrl,
      expiresAt: expiresAt.toISOString(),
      results,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation failed.' },
        { status: 400 }
      );
    }
    console.error('Error sending lead survey invites:', error);
    return NextResponse.json({ error: 'Failed to send survey invitations.' }, { status: 500 });
  }
}
