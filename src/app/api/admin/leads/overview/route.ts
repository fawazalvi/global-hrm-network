import { NextResponse } from 'next/server';
import { db } from '@/backend/db';
import { requireLeadPermission } from '@/backend/leads/permissions';
import { getLeadOutreachOverview } from '@/backend/leads/service';
import { DEFAULT_EMAIL_TEMPLATES } from '@/backend/email/templates';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const perm = await requireLeadPermission('view_leads');
  if (!perm.ok) return perm.response;

  try {
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const institutionId = searchParams.get('institutionId') || undefined;
    const campaignId = searchParams.get('campaignId') || undefined;

    const [overview, institutions, campaigns] = await Promise.all([
      getLeadOutreachOverview({ dateFrom, dateTo, institutionId, campaignId }),
      db.institution.findMany({
        where: { isActive: true, isSelectable: true },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, shortCode: true },
      }),
      db.surveyCampaign.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, slug: true, title: true, status: true },
      }),
    ]);

    const templates = [
      {
        emailType: 'pakistan_launch_invitation',
        name: DEFAULT_EMAIL_TEMPLATES.pakistan_launch_invitation.name,
      },
      {
        emailType: 'survey_invitation',
        name: DEFAULT_EMAIL_TEMPLATES.survey_invitation.name,
      },
    ];

    return NextResponse.json({
      overview,
      options: {
        institutions,
        campaigns,
        templates,
      },
    });
  } catch (error: any) {
    console.error('Error loading lead outreach overview:', error);
    return NextResponse.json({ error: 'Failed to load dashboard overview.' }, { status: 500 });
  }
}
