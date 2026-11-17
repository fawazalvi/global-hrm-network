import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '@/backend/db';
import { requireLeadPermission } from '@/backend/leads/permissions';
import { getLeadDetailsById } from '@/backend/leads/service';

const UpdateLeadSchema = z.object({
  fullName: z.string().trim().max(120).optional().nullable(),
  institutionId: z.string().trim().optional().nullable(),
  institutionName: z.string().trim().max(160).optional().nullable(),
  designation: z.string().trim().max(140).optional().nullable(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
  isArchived: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const perm = await requireLeadPermission('view_leads');
  if (!perm.ok) return perm.response;

  try {
    const { id } = await params;
    const details = await getLeadDetailsById(id);
    if (!details) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }
    return NextResponse.json(details);
  } catch (error: any) {
    console.error('Error loading lead details:', error);
    return NextResponse.json({ error: 'Failed to load lead details.' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const perm = await requireLeadPermission('edit_import_leads');
  if (!perm.ok) return perm.response;
  const { session } = perm;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = UpdateLeadSchema.parse(body);

    const existing = await db.leadContact.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }

    const updated = await db.leadContact.update({
      where: { id },
      data: {
        ...(parsed.fullName !== undefined ? { fullName: parsed.fullName || null } : {}),
        ...(parsed.institutionId !== undefined ? { institutionId: parsed.institutionId || null } : {}),
        ...(parsed.institutionName !== undefined ? { institutionName: parsed.institutionName || null } : {}),
        ...(parsed.designation !== undefined ? { designation: parsed.designation || null } : {}),
        ...(parsed.tags !== undefined ? { tagsJson: JSON.stringify(parsed.tags) } : {}),
        ...(parsed.notes !== undefined ? { notes: parsed.notes || null } : {}),
        ...(parsed.isArchived !== undefined
          ? {
              isArchived: parsed.isArchived,
              archivedAt: parsed.isArchived ? new Date() : null,
            }
          : {}),
        updatedByUserId: session.user.id,
      },
    });

    await db.leadAuditLog.create({
      data: {
        leadId: id,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: parsed.isArchived !== undefined
          ? parsed.isArchived
            ? 'archived'
            : 'unarchived'
          : 'updated',
        summary:
          parsed.isArchived !== undefined
            ? `${parsed.isArchived ? 'Archived' : 'Unarchived'} lead ${existing.email}.`
            : `Updated lead profile for ${existing.email}.`,
      },
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation failed.' },
        { status: 400 }
      );
    }
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: 'Failed to update lead.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const perm = await requireLeadPermission('edit_import_leads');
  if (!perm.ok) return perm.response;

  try {
    const { id } = await params;
    const lead = await db.leadContact.findUnique({
      where: { id },
      include: { _count: { select: { invites: true } } },
    });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }

    const subCount = await db.surveySubmission.count({
      where: { normalizedEmail: lead.normalizedEmail },
    });
    if (lead._count.invites > 0 || subCount > 0) {
      return NextResponse.json(
        {
          error:
            'This lead has invitation or survey history. Archive the lead instead of deleting it.',
        },
        { status: 409 }
      );
    }

    await db.leadContact.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Failed to delete lead.' }, { status: 500 });
  }
}
