import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '@/backend/db';
import { requireLeadPermission } from '@/backend/leads/permissions';
import { queryLeadsPaginated } from '@/backend/leads/service';
import { normalizeEmail } from '@/backend/survey-validation';

export const dynamic = 'force-dynamic';

const CreateLeadSchema = z.object({
  email: z.string().trim().email('Valid email address is required.'),
  fullName: z.string().trim().max(120).optional().nullable(),
  institutionId: z.string().trim().optional().nullable(),
  institutionName: z.string().trim().max(160).optional().nullable(),
  designation: z.string().trim().max(140).optional().nullable(),
  source: z.string().trim().max(40).default('manual'),
  sourceUrl: z.string().trim().max(500).optional().nullable(),
  tags: z.array(z.string().trim().max(40)).max(20).optional().default([]),
  notes: z.string().trim().max(2000).optional().nullable(),
  campaignId: z.string().trim().optional().nullable(),
});

export async function GET(req: Request) {
  const perm = await requireLeadPermission('view_leads');
  if (!perm.ok) return perm.response;

  try {
    const { searchParams } = new URL(req.url);
    const data = await queryLeadsPaginated({
      search: searchParams.get('search') || undefined,
      institutionId: searchParams.get('institutionId') || undefined,
      source: searchParams.get('source') || undefined,
      campaignId: searchParams.get('campaignId') || undefined,
      emailType: searchParams.get('emailType') || undefined,
      participationStage: searchParams.get('participationStage') || undefined,
      deliveryStatus: searchParams.get('deliveryStatus') || undefined,
      visited: searchParams.get('visited') || undefined,
      verified: searchParams.get('verified') || undefined,
      completed: searchParams.get('completed') || undefined,
      suppressed: searchParams.get('suppressed') || undefined,
      expired: searchParams.get('expired') || undefined,
      neverInvited: searchParams.get('neverInvited') || undefined,
      archived: (searchParams.get('archived') as any) || 'active',
      tag: searchParams.get('tag') || undefined,
      createdFrom: searchParams.get('createdFrom') || undefined,
      createdTo: searchParams.get('createdTo') || undefined,
      invitedFrom: searchParams.get('invitedFrom') || undefined,
      invitedTo: searchParams.get('invitedTo') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortDir: (searchParams.get('sortDir') as any) === 'asc' ? 'asc' : 'desc',
      page: Number(searchParams.get('page') || 1),
      pageSize: Number(searchParams.get('pageSize') || 25),
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error querying leads:', error);
    return NextResponse.json({ error: 'Failed to load leads.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const perm = await requireLeadPermission('edit_import_leads');
  if (!perm.ok) return perm.response;
  const { session } = perm;

  try {
    const body = await req.json().catch(() => null);
    const parsed = CreateLeadSchema.parse(body);
    const normalizedEmail = normalizeEmail(parsed.email);

    const existing = await db.leadContact.findUnique({
      where: { normalizedEmail },
      select: { id: true, email: true, isArchived: true },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: `A lead with email "${existing.email}" already exists${existing.isArchived ? ' (archived)' : ''}.`,
          existingId: existing.id,
        },
        { status: 409 }
      );
    }

    const created = await db.leadContact.create({
      data: {
        email: parsed.email.trim(),
        normalizedEmail,
        fullName: parsed.fullName || null,
        institutionId: parsed.institutionId || null,
        institutionName: parsed.institutionName || null,
        designation: parsed.designation || null,
        source: parsed.source || 'manual',
        sourceUrl: parsed.sourceUrl || null,
        tagsJson: JSON.stringify(parsed.tags || []),
        notes: parsed.notes || null,
        createdByUserId: session.user.id,
        updatedByUserId: session.user.id,
      },
    });

    if (parsed.campaignId) {
      await db.leadCampaignMembership.create({
        data: {
          leadId: created.id,
          campaignId: parsed.campaignId,
          assignedByUserId: session.user.id,
        },
      });
    }

    await db.leadAuditLog.create({
      data: {
        leadId: created.id,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'created',
        summary: `Created lead ${created.email} (${created.source}).`,
      },
    });

    return NextResponse.json({ success: true, lead: created }, { status: 201 });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation failed.' },
        { status: 400 }
      );
    }
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Failed to create lead.' }, { status: 500 });
  }
}
