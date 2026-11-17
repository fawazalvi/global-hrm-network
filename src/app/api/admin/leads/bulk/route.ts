import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '@/backend/db';
import { requireLeadPermission } from '@/backend/leads/permissions';
import { parseTags, queryLeadsPaginated } from '@/backend/leads/service';

const BulkActionSchema = z.object({
  action: z.enum([
    'add_tags',
    'remove_tags',
    'assign_campaign',
    'suppress',
    'unsuppress',
    'archive',
    'unarchive',
  ]),
  scope: z.enum(['selected_ids', 'all_matching']).default('selected_ids'),
  leadIds: z.array(z.string()).optional(),
  filters: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.string().trim().max(40)).optional(),
  campaignId: z.string().optional(),
  reason: z.string().trim().max(300).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = BulkActionSchema.parse(body);

    const neededPerm =
      parsed.action === 'suppress' || parsed.action === 'unsuppress'
        ? 'manage_suppression'
        : 'edit_import_leads';
    const perm = await requireLeadPermission(neededPerm);
    if (!perm.ok) return perm.response;
    const { session } = perm;

    let targetLeads: Array<{ id: string; email: string; normalizedEmail: string; tagsJson: string }> = [];

    if (parsed.scope === 'selected_ids') {
      targetLeads = await db.leadContact.findMany({
        where: { id: { in: parsed.leadIds || [] } },
        select: { id: true, email: true, normalizedEmail: true, tagsJson: true },
      });
    } else {
      const pageRes = await queryLeadsPaginated({
        ...(parsed.filters || {}),
        page: 1,
        pageSize: 100,
      });
      const ids = pageRes.items.map((i) => i.id);
      targetLeads = await db.leadContact.findMany({
        where: { id: { in: ids } },
        select: { id: true, email: true, normalizedEmail: true, tagsJson: true },
      });
    }

    if (targetLeads.length === 0) {
      return NextResponse.json({ error: 'No matching leads selected.' }, { status: 400 });
    }

    let affected = 0;

    if (parsed.action === 'add_tags' || parsed.action === 'remove_tags') {
      const tagInputs = (parsed.tags || []).map((t) => t.trim()).filter(Boolean);
      if (tagInputs.length === 0) {
        return NextResponse.json({ error: 'At least one tag is required.' }, { status: 400 });
      }
      for (const lead of targetLeads) {
        const current = new Set(parseTags(lead.tagsJson));
        if (parsed.action === 'add_tags') {
          tagInputs.forEach((t) => current.add(t));
        } else {
          tagInputs.forEach((t) => current.delete(t));
        }
        await db.leadContact.update({
          where: { id: lead.id },
          data: { tagsJson: JSON.stringify(Array.from(current)), updatedByUserId: session.user.id },
        });
        affected++;
      }
    } else if (parsed.action === 'assign_campaign') {
      if (!parsed.campaignId) {
        return NextResponse.json({ error: 'Campaign is required.' }, { status: 400 });
      }
      for (const lead of targetLeads) {
        await db.leadCampaignMembership.upsert({
          where: { leadId_campaignId: { leadId: lead.id, campaignId: parsed.campaignId } },
          update: {},
          create: {
            leadId: lead.id,
            campaignId: parsed.campaignId,
            assignedByUserId: session.user.id,
          },
        });
        affected++;
      }
    } else if (parsed.action === 'suppress') {
      const reason = parsed.reason || 'manual';
      for (const lead of targetLeads) {
        await db.emailSuppression.upsert({
          where: { normalizedEmail: lead.normalizedEmail },
          update: { reason, source: `admin:${session.user.email}` },
          create: {
            normalizedEmail: lead.normalizedEmail,
            reason,
            source: `admin:${session.user.email}`,
          },
        });
        await db.leadAuditLog.create({
          data: {
            leadId: lead.id,
            actorUserId: session.user.id,
            actorEmail: session.user.email,
            action: 'suppressed',
            summary: `Suppressed ${lead.email} (reason: ${reason}).`,
          },
        });
        affected++;
      }
    } else if (parsed.action === 'unsuppress') {
      if (!parsed.reason || !parsed.reason.trim()) {
        return NextResponse.json(
          { error: 'An explicit reason is required to unsuppress contacts.' },
          { status: 400 }
        );
      }
      for (const lead of targetLeads) {
        await db.emailSuppression.deleteMany({
          where: { normalizedEmail: lead.normalizedEmail },
        });
        await db.leadAuditLog.create({
          data: {
            leadId: lead.id,
            actorUserId: session.user.id,
            actorEmail: session.user.email,
            action: 'unsuppressed',
            summary: `Unsuppressed ${lead.email} (reason: ${parsed.reason.trim()}).`,
          },
        });
        affected++;
      }
    } else if (parsed.action === 'archive' || parsed.action === 'unarchive') {
      const isArchived = parsed.action === 'archive';
      await db.leadContact.updateMany({
        where: { id: { in: targetLeads.map((l) => l.id) } },
        data: {
          isArchived,
          archivedAt: isArchived ? new Date() : null,
          updatedByUserId: session.user.id,
        },
      });
      affected = targetLeads.length;
    }

    await db.leadAuditLog.create({
      data: {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: parsed.action,
        summary: `Bulk action "${parsed.action}" applied to ${affected} lead(s).`,
      },
    });

    return NextResponse.json({ success: true, affected });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation failed.' },
        { status: 400 }
      );
    }
    console.error('Bulk lead action error:', error);
    return NextResponse.json({ error: 'Bulk action failed.' }, { status: 500 });
  }
}
