import { NextResponse } from 'next/server';
import { db } from '@/backend/db';
import { requireLeadPermission } from '@/backend/leads/permissions';
import { queryLeadsPaginated, sanitizeCsvCell } from '@/backend/leads/service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const perm = await requireLeadPermission('export_leads');
  if (!perm.ok) return perm.response;
  const { session } = perm;

  try {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');

    let items: any[] = [];
    if (idsParam && idsParam.trim()) {
      const ids = idsParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 500);
      const rows = await db.leadContact.findMany({
        where: { id: { in: ids } },
        include: { institution: { select: { name: true } } },
      });
      items = rows.map((r) => ({
        email: r.email,
        fullName: r.fullName || '',
        institutionName: r.institution?.name || r.institutionName || '',
        designation: r.designation || '',
        source: r.source,
        tags: r.tagsJson,
        createdAt: r.createdAt.toISOString(),
      }));
    } else {
      const pageRes = await queryLeadsPaginated({
        search: searchParams.get('search') || undefined,
        institutionId: searchParams.get('institutionId') || undefined,
        source: searchParams.get('source') || undefined,
        campaignId: searchParams.get('campaignId') || undefined,
        participationStage: searchParams.get('participationStage') || undefined,
        deliveryStatus: searchParams.get('deliveryStatus') || undefined,
        suppressed: searchParams.get('suppressed') || undefined,
        neverInvited: searchParams.get('neverInvited') || undefined,
        archived: (searchParams.get('archived') as any) || 'active',
        page: 1,
        pageSize: 100,
      });
      items = pageRes.items;
    }

    const headers = [
      'Email',
      'Full Name',
      'Institution',
      'Designation',
      'Source',
      'Participation Stage',
      'Latest Delivery Status',
      'Suppressed',
      'Tags',
      'Created At',
    ];

    const lines = [
      headers.map(sanitizeCsvCell).join(','),
      ...items.map((item) =>
        [
          item.email,
          item.fullName || '',
          item.institutionName || '',
          item.designation || '',
          item.source || '',
          item.participationStage || '',
          item.latestDeliveryLabel || '',
          item.suppressed ? `Yes (${item.suppressionReason || 'suppressed'})` : 'No',
          Array.isArray(item.tags) ? item.tags.join('; ') : '',
          item.createdAt || '',
        ]
          .map(sanitizeCsvCell)
          .join(',')
      ),
    ];

    await db.leadAuditLog.create({
      data: {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'exported',
        summary: `Exported ${items.length} lead contact(s) to CSV.`,
      },
    });

    return new NextResponse(lines.join('\r\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ghrm-leads-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Export leads error:', error);
    return NextResponse.json({ error: 'Failed to export leads.' }, { status: 500 });
  }
}
