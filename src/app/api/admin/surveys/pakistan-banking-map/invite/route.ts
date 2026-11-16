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
  contacts: z.array(LeadContactSchema).min(1, 'At least one contact is required.').max(50, 'Maximum 50 contacts per batch.'),
});

export async function GET() {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;

  try {
    const [campaign, recentInvites] = await Promise.all([
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
    ]);

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
    const surveyUrl = `${origin}/surveys/pakistan-banking-map`;

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

      const unsubscribeUrl = `${surveyUrl}?optOut=${encodeURIComponent(contact.email.trim())}`;

      const dispatch = await enqueueAndSendEmail({
        businessKey: `admin-lead-invite:${campaign.id}:${parsed.templateType}:${normalized}`,
        emailType: parsed.templateType,
        recipientEmail: contact.email.trim(),
        recipientName: contact.name?.trim() || '',
        campaignId: campaign.id,
        templateData: {
          preferred_name: contact.name?.trim() || '',
          institution_name: contact.institution?.trim() || '',
          survey_title: campaign.title,
          survey_url: surveyUrl,
          unsubscribe_url: unsubscribeUrl,
        },
      });

      results.push({
        email: contact.email,
        status: dispatch.status,
        success: dispatch.success,
        message: dispatch.message,
      });
    }

    return NextResponse.json({
      success: true,
      surveyUrl,
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
