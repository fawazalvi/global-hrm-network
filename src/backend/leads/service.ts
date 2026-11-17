import crypto from 'crypto';
import type { Prisma } from '@prisma/client';
import { db } from '@/backend/db';
import { enqueueAndSendEmail } from '@/backend/email/service';
import { normalizeEmail } from '@/backend/survey-validation';

export interface LeadFilterParams {
  search?: string;
  institutionId?: string;
  source?: string;
  campaignId?: string;
  emailType?: string;
  participationStage?: string;
  deliveryStatus?: string;
  visited?: string;
  verified?: string;
  completed?: string;
  suppressed?: string;
  expired?: string;
  neverInvited?: string;
  archived?: 'active' | 'archived' | 'all';
  tag?: string;
  createdFrom?: string;
  createdTo?: string;
  invitedFrom?: string;
  invitedTo?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

const ALLOWED_PAGE_SIZES = new Set([10, 25, 50, 100]);
const ALLOWED_SORT_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'email',
  'fullName',
  'institutionName',
  'source',
]);

export function sanitizeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function parseTags(tagsJson: string | null | undefined): string[] {
  if (!tagsJson) return [];
  try {
    const arr = JSON.parse(tagsJson);
    return Array.isArray(arr) ? arr.filter((t) => typeof t === 'string' && t.trim()) : [];
  } catch {
    return [];
  }
}

export function friendlyDeliveryLabel(status: string | null | undefined): string {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'processing':
      return 'Processing';
    case 'accepted_by_smtp':
      return 'Accepted by mail server';
    case 'delivered':
      return 'Delivered';
    case 'temporarily_failed':
      return 'Temporarily failed';
    case 'permanently_failed':
      return 'Failed';
    case 'bounced':
      return 'Bounced';
    case 'suppressed':
      return 'Suppressed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Not sent';
  }
}

export function redactTechnicalText(text: string | null | undefined): string | null {
  if (!text) return null;
  return text
    .replace(/token=[^&\s]+/gi, 'token=[REDACTED]')
    .replace(/invite=[^&\s]+/gi, 'invite=[REDACTED]')
    .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
    .replace(/postgresql:\/\/\S+/gi, 'postgresql://[REDACTED]');
}

async function buildLeadWhereClause(
  filters: LeadFilterParams
): Promise<{ where: Prisma.LeadContactWhereInput; impossible: boolean }> {
  const conditions: Prisma.LeadContactWhereInput[] = [];
  const archivedMode = filters.archived || 'active';
  if (archivedMode === 'active') conditions.push({ isArchived: false });
  else if (archivedMode === 'archived') conditions.push({ isArchived: true });

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim();
    conditions.push({
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
        { institutionName: { contains: q, mode: 'insensitive' } },
        { designation: { contains: q, mode: 'insensitive' } },
        { tagsJson: { contains: q, mode: 'insensitive' } },
        { institution: { name: { contains: q, mode: 'insensitive' } } },
      ],
    });
  }

  if (filters.institutionId && filters.institutionId !== 'all') {
    conditions.push({ institutionId: filters.institutionId });
  }
  if (filters.source && filters.source !== 'all') {
    conditions.push({ source: filters.source });
  }
  if (filters.tag && filters.tag.trim()) {
    conditions.push({ tagsJson: { contains: `"${filters.tag.trim()}"`, mode: 'insensitive' } });
  }
  if (filters.campaignId && filters.campaignId !== 'all') {
    conditions.push({
      OR: [
        { campaignMemberships: { some: { campaignId: filters.campaignId } } },
        { invites: { some: { campaignId: filters.campaignId } } },
      ],
    });
  }

  if (filters.createdFrom || filters.createdTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.createdFrom) createdAt.gte = new Date(filters.createdFrom);
    if (filters.createdTo) {
      const end = new Date(filters.createdTo);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    conditions.push({ createdAt });
  }

  if (filters.invitedFrom || filters.invitedTo) {
    const invDate: Prisma.DateTimeFilter = {};
    if (filters.invitedFrom) invDate.gte = new Date(filters.invitedFrom);
    if (filters.invitedTo) {
      const end = new Date(filters.invitedTo);
      end.setHours(23, 59, 59, 999);
      invDate.lte = end;
    }
    conditions.push({ invites: { some: { createdAt: invDate } } });
  }

  if (filters.neverInvited === 'yes') {
    conditions.push({ invites: { none: {} } });
  } else if (filters.neverInvited === 'no') {
    conditions.push({ invites: { some: {} } });
  }

  if (filters.visited === 'yes') {
    conditions.push({ invites: { some: { openedAt: { not: null } } } });
  } else if (filters.visited === 'no') {
    conditions.push({ invites: { none: { openedAt: { not: null } } } });
  }

  const now = new Date();
  if (filters.expired === 'yes') {
    conditions.push({
      invites: { some: { expiresAt: { lt: now }, completedAt: null } },
    });
  } else if (filters.expired === 'no') {
    conditions.push({
      invites: { some: { expiresAt: { gte: now } } },
    });
  }

  // Email-correlated filters (Suppression, SurveySubmission, EmailOutbox)
  if (filters.suppressed === 'yes' || filters.suppressed === 'no') {
    const supRows = await db.emailSuppression.findMany({ select: { normalizedEmail: true } });
    const supEmails = supRows.map((s) => s.normalizedEmail);
    if (filters.suppressed === 'yes') {
      if (supEmails.length === 0) return { where: {}, impossible: true };
      conditions.push({ normalizedEmail: { in: supEmails } });
    } else if (supEmails.length > 0) {
      conditions.push({ normalizedEmail: { notIn: supEmails } });
    }
  }

  if (
    filters.verified === 'yes' ||
    filters.verified === 'no' ||
    filters.completed === 'yes' ||
    filters.completed === 'no'
  ) {
    const verifiedRows = await db.surveySubmission.findMany({
      where: {
        status: 'verified',
        ...(filters.campaignId && filters.campaignId !== 'all'
          ? { campaignId: filters.campaignId }
          : {}),
      },
      select: { normalizedEmail: true },
    });
    const verifiedEmails = verifiedRows.map((v) => v.normalizedEmail);
    const wantVerified = filters.verified === 'yes' || filters.completed === 'yes';
    const wantNotVerified = filters.verified === 'no' || filters.completed === 'no';
    if (wantVerified) {
      if (verifiedEmails.length === 0) return { where: {}, impossible: true };
      conditions.push({ normalizedEmail: { in: verifiedEmails } });
    } else if (wantNotVerified && verifiedEmails.length > 0) {
      conditions.push({ normalizedEmail: { notIn: verifiedEmails } });
    }
  }

  if (filters.deliveryStatus && filters.deliveryStatus !== 'all') {
    const outboxRows = await db.emailOutbox.findMany({
      where: {
        status: filters.deliveryStatus,
        emailType: { in: ['pakistan_launch_invitation', 'survey_invitation'] },
      },
      select: { normalizedRecipient: true },
    });
    const matchingEmails = Array.from(new Set(outboxRows.map((o) => o.normalizedRecipient)));
    if (matchingEmails.length === 0) return { where: {}, impossible: true };
    conditions.push({ normalizedEmail: { in: matchingEmails } });
  }

  if (filters.emailType && filters.emailType !== 'all') {
    const outboxRows = await db.emailOutbox.findMany({
      where: { emailType: filters.emailType },
      select: { normalizedRecipient: true },
    });
    const matchingEmails = Array.from(new Set(outboxRows.map((o) => o.normalizedRecipient)));
    if (matchingEmails.length === 0) return { where: {}, impossible: true };
    conditions.push({ normalizedEmail: { in: matchingEmails } });
  }

  if (filters.participationStage && filters.participationStage !== 'all') {
    const [verifiedRows, pendingRows] = await Promise.all([
      db.surveySubmission.findMany({
        where: { status: 'verified' },
        select: { normalizedEmail: true },
      }),
      db.surveySubmission.findMany({
        where: { status: 'pending' },
        select: { normalizedEmail: true },
      }),
    ]);
    const verifiedSet = verifiedRows.map((r) => r.normalizedEmail);
    const pendingSet = pendingRows.map((r) => r.normalizedEmail);

    switch (filters.participationStage) {
      case 'not_invited':
        conditions.push({ invites: { none: {} } });
        if (verifiedSet.length > 0) conditions.push({ normalizedEmail: { notIn: verifiedSet } });
        break;
      case 'invited':
        conditions.push({ invites: { some: { openedAt: null } } });
        if (verifiedSet.length > 0) conditions.push({ normalizedEmail: { notIn: verifiedSet } });
        break;
      case 'visited_survey':
        conditions.push({ invites: { some: { openedAt: { not: null }, completedAt: null } } });
        if (verifiedSet.length > 0) conditions.push({ normalizedEmail: { notIn: verifiedSet } });
        break;
      case 'pending_verification':
        if (pendingSet.length === 0) return { where: {}, impossible: true };
        conditions.push({ normalizedEmail: { in: pendingSet } });
        break;
      case 'verified_completed':
        if (verifiedSet.length === 0) return { where: {}, impossible: true };
        conditions.push({ normalizedEmail: { in: verifiedSet } });
        break;
    }
  }

  return {
    where: conditions.length > 0 ? { AND: conditions } : {},
    impossible: false,
  };
}

export async function queryLeadsPaginated(filters: LeadFilterParams) {
  const pageSize = ALLOWED_PAGE_SIZES.has(Number(filters.pageSize))
    ? Number(filters.pageSize)
    : 25;
  const page = Math.max(1, Number(filters.page) || 1);
  const sortBy = ALLOWED_SORT_FIELDS.has(filters.sortBy || '') ? filters.sortBy! : 'createdAt';
  const sortDir: 'asc' | 'desc' = filters.sortDir === 'asc' ? 'asc' : 'desc';

  const { where, impossible } = await buildLeadWhereClause(filters);
  if (impossible) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  const total = await db.leadContact.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;

  const rows = await db.leadContact.findMany({
    where,
    orderBy: [{ [sortBy]: sortDir }, { id: 'desc' }],
    skip,
    take: pageSize,
    include: {
      institution: { select: { id: true, name: true, shortCode: true } },
      campaignMemberships: {
        include: { campaign: { select: { id: true, title: true, slug: true } } },
      },
      invites: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: {
        select: { invites: true },
      },
    },
  });

  const normalizedList = rows.map((r) => r.normalizedEmail);
  const outboxIds = rows
    .map((r) => r.invites[0]?.outboxId)
    .filter((id): id is string => Boolean(id));

  const [suppressions, submissions, outboxRows] = await Promise.all([
    normalizedList.length
      ? db.emailSuppression.findMany({
          where: { normalizedEmail: { in: normalizedList } },
        })
      : [],
    normalizedList.length
      ? db.surveySubmission.findMany({
          where: { normalizedEmail: { in: normalizedList } },
          orderBy: { submittedAt: 'desc' },
          select: {
            id: true,
            normalizedEmail: true,
            status: true,
            submittedAt: true,
            verifiedAt: true,
          },
        })
      : [],
    outboxIds.length
      ? db.emailOutbox.findMany({
          where: { id: { in: outboxIds } },
          select: {
            id: true,
            status: true,
            emailType: true,
            attemptCount: true,
            sentAt: true,
            createdAt: true,
          },
        })
      : [],
  ]);

  const supMap = new Map(suppressions.map((s) => [s.normalizedEmail, s]));
  const subMap = new Map<string, (typeof submissions)[number]>();
  for (const s of submissions) {
    if (!subMap.has(s.normalizedEmail)) subMap.set(s.normalizedEmail, s);
  }
  const outboxMap = new Map(outboxRows.map((o) => [o.id, o]));
  const now = new Date();

  const items = rows.map((lead) => {
    const latestInvite = lead.invites[0] || null;
    const latestOutbox = latestInvite?.outboxId ? outboxMap.get(latestInvite.outboxId) || null : null;
    const suppression = supMap.get(lead.normalizedEmail) || null;
    const submission = subMap.get(lead.normalizedEmail) || null;

    let participationStage = 'not_invited';
    if (submission?.status === 'verified' || latestInvite?.completedAt) {
      participationStage = 'verified_completed';
    } else if (submission?.status === 'pending') {
      participationStage = 'pending_verification';
    } else if (latestInvite?.openedAt) {
      participationStage = 'visited_survey';
    } else if (latestInvite) {
      participationStage = 'invited';
    }

    return {
      id: lead.id,
      email: lead.email,
      normalizedEmail: lead.normalizedEmail,
      fullName: lead.fullName,
      institutionId: lead.institutionId,
      institutionName: lead.institution?.name || lead.institutionName || null,
      designation: lead.designation,
      source: lead.source,
      tags: parseTags(lead.tagsJson),
      isArchived: lead.isArchived,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      campaigns: lead.campaignMemberships.map((m) => m.campaign),
      attemptCount: lead._count.invites,
      latestInvite: latestInvite
        ? {
            id: latestInvite.id,
            createdAt: latestInvite.createdAt.toISOString(),
            expiresAt: latestInvite.expiresAt.toISOString(),
            isExpired: latestInvite.expiresAt < now,
            openedAt: latestInvite.openedAt ? latestInvite.openedAt.toISOString() : null,
            openCount: latestInvite.openCount,
            completedAt: latestInvite.completedAt ? latestInvite.completedAt.toISOString() : null,
          }
        : null,
      latestDeliveryStatus: latestOutbox?.status || null,
      latestDeliveryLabel: friendlyDeliveryLabel(latestOutbox?.status),
      latestEmailType: latestOutbox?.emailType || null,
      participationStage,
      suppressed: Boolean(suppression),
      suppressionReason: suppression?.reason || null,
      verified: submission?.status === 'verified',
    };
  });

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export async function getLeadOutreachOverview(params: {
  dateFrom?: string;
  dateTo?: string;
  institutionId?: string;
  campaignId?: string;
}) {
  const leadWhere: Prisma.LeadContactWhereInput = { isArchived: false };
  if (params.institutionId && params.institutionId !== 'all') {
    leadWhere.institutionId = params.institutionId;
  }
  if (params.campaignId && params.campaignId !== 'all') {
    leadWhere.OR = [
      { campaignMemberships: { some: { campaignId: params.campaignId } } },
      { invites: { some: { campaignId: params.campaignId } } },
    ];
  }

  const dateRange: Prisma.DateTimeFilter = {};
  if (params.dateFrom) dateRange.gte = new Date(params.dateFrom);
  if (params.dateTo) {
    const end = new Date(params.dateTo);
    end.setHours(23, 59, 59, 999);
    dateRange.lte = end;
  }
  const hasDateFilter = Boolean(params.dateFrom || params.dateTo);

  const outboxWhere: Prisma.EmailOutboxWhereInput = {
    emailType: { in: ['pakistan_launch_invitation', 'survey_invitation'] },
    ...(params.campaignId && params.campaignId !== 'all' ? { campaignId: params.campaignId } : {}),
    ...(hasDateFilter ? { createdAt: dateRange } : {}),
  };

  const inviteWhere: Prisma.SurveyLeadInviteWhereInput = {
    ...(params.campaignId && params.campaignId !== 'all' ? { campaignId: params.campaignId } : {}),
    ...(hasDateFilter ? { createdAt: dateRange } : {}),
  };

  const submissionWhere: Prisma.SurveySubmissionWhereInput = {
    ...(params.campaignId && params.campaignId !== 'all' ? { campaignId: params.campaignId } : {}),
    ...(params.institutionId && params.institutionId !== 'all'
      ? { institutionId: params.institutionId }
      : {}),
    ...(hasDateFilter ? { submittedAt: dateRange } : {}),
  };

  const [
    totalLeads,
    suppressedRows,
    verifiedSubmissions,
    allSubmissions,
    invites,
    outboxRows,
    institutions,
    recentAudit,
  ] = await Promise.all([
    db.leadContact.count({ where: leadWhere }),
    db.emailSuppression.findMany({ select: { normalizedEmail: true } }),
    db.surveySubmission.count({ where: { ...submissionWhere, status: 'verified' } }),
    db.surveySubmission.count({ where: submissionWhere }),
    db.surveyLeadInvite.findMany({
      where: inviteWhere,
      select: {
        id: true,
        leadId: true,
        normalizedRecipient: true,
        openedAt: true,
        completedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
    db.emailOutbox.findMany({
      where: outboxWhere,
      select: {
        id: true,
        status: true,
        recipientEmail: true,
        normalizedRecipient: true,
        lastError: true,
        createdAt: true,
      },
    }),
    db.leadContact.groupBy({
      by: ['institutionId', 'institutionName'],
      where: leadWhere,
      _count: { id: true },
    }),
    db.leadAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
  ]);

  const supSet = new Set(suppressedRows.map((s) => s.normalizedEmail));
  const uniqueInvitedSet = new Set(invites.map((i) => i.normalizedRecipient));
  const uniqueVisitedSet = new Set(
    invites.filter((i) => i.openedAt !== null).map((i) => i.normalizedRecipient)
  );

  // Eligible leads not yet invited
  const activeLeadEmails = await db.leadContact.findMany({
    where: { ...leadWhere, invites: { none: {} } },
    select: { normalizedEmail: true },
  });
  const verifiedEmailSet = new Set(
    (
      await db.surveySubmission.findMany({
        where: { status: 'verified' },
        select: { normalizedEmail: true },
      })
    ).map((v) => v.normalizedEmail)
  );
  const eligibleNotInvited = activeLeadEmails.filter(
    (l) => !supSet.has(l.normalizedEmail) && !verifiedEmailSet.has(l.normalizedEmail)
  ).length;

  const suppressedLeadsCount = await db.leadContact.count({
    where: {
      ...leadWhere,
      normalizedEmail: { in: Array.from(supSet) },
    },
  });

  const invitationsQueued = outboxRows.filter((o) =>
    ['queued', 'processing', 'temporarily_failed'].includes(o.status)
  ).length;
  const invitationsAcceptedBySmtp = outboxRows.filter(
    (o) => o.status === 'accepted_by_smtp'
  ).length;
  const invitationsDelivered = outboxRows.filter((o) => o.status === 'delivered').length;
  const failedEmailAttempts = outboxRows.filter((o) =>
    ['permanently_failed', 'temporarily_failed', 'bounced'].includes(o.status)
  ).length;

  const now = new Date();
  const expiredUncompletedCount = invites.filter(
    (i) => i.expiresAt < now && !i.completedAt
  ).length;

  // Daily trend (last 14 days)
  const trendMap = new Map<string, { date: string; invites: number; visits: number; completions: number }>();
  for (const inv of invites) {
    const d = inv.createdAt.toISOString().slice(0, 10);
    const entry = trendMap.get(d) || { date: d, invites: 0, visits: 0, completions: 0 };
    entry.invites += 1;
    if (inv.openedAt) entry.visits += 1;
    if (inv.completedAt) entry.completions += 1;
    trendMap.set(d, entry);
  }
  const trends = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  // Institution distribution
  const instIds = institutions.map((i) => i.institutionId).filter((id): id is string => Boolean(id));
  const instLookup = new Map(
    (
      await db.institution.findMany({
        where: { id: { in: instIds } },
        select: { id: true, name: true },
      })
    ).map((i) => [i.id, i.name])
  );
  const leadDistributionByInstitution = institutions
    .map((g) => ({
      institution:
        (g.institutionId ? instLookup.get(g.institutionId) : null) ||
        g.institutionName ||
        'Unspecified',
      count: g._count.id,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const completionsByInstRaw = await db.surveySubmission.groupBy({
    by: ['institutionId', 'otherInstitutionText'],
    where: { ...submissionWhere, status: 'verified' },
    _count: { id: true },
  });
  const compInstIds = completionsByInstRaw
    .map((c) => c.institutionId)
    .filter((id): id is string => Boolean(id));
  const compInstLookup = new Map(
    (
      await db.institution.findMany({
        where: { id: { in: compInstIds } },
        select: { id: true, name: true },
      })
    ).map((i) => [i.id, i.name])
  );
  const completionsByInstitution = completionsByInstRaw
    .map((c) => ({
      institution:
        (c.institutionId ? compInstLookup.get(c.institutionId) : null) ||
        c.otherInstitutionText ||
        'Unspecified',
      count: c._count.id,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const uniqueInvitedCount = uniqueInvitedSet.size;
  const uniqueVisitedCount = uniqueVisitedSet.size;

  return {
    cards: {
      totalLeads,
      eligibleNotInvited,
      uniqueLeadsInvited: uniqueInvitedCount,
      invitationsQueued,
      invitationsAcceptedBySmtp,
      invitationsDelivered,
      failedEmailAttempts,
      uniqueLeadsWithSurveyVisits: uniqueVisitedCount,
      verifiedParticipants: verifiedSubmissions,
      completedSurveys: allSubmissions,
      suppressedLeads: suppressedLeadsCount,
    },
    funnel: {
      totalLeads,
      uniqueInvited: uniqueInvitedCount,
      uniqueVisited: uniqueVisitedCount,
      verifiedCompleted: verifiedSubmissions,
      visitRateOfInvitedPct:
        uniqueInvitedCount > 0 ? Math.round((uniqueVisitedCount / uniqueInvitedCount) * 100) : 0,
      completionRateOfInvitedPct:
        uniqueInvitedCount > 0 ? Math.round((verifiedSubmissions / uniqueInvitedCount) * 100) : 0,
    },
    attention: {
      failedEmailAttempts,
      expiredUncompletedInvitations: expiredUncompletedCount,
    },
    trends,
    leadDistributionByInstitution,
    completionsByInstitution,
    recentActivity: recentAudit.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export async function getLeadDetailsById(leadId: string) {
  const lead = await db.leadContact.findUnique({
    where: { id: leadId },
    include: {
      institution: { select: { id: true, name: true, shortCode: true } },
      campaignMemberships: {
        include: { campaign: { select: { id: true, title: true, slug: true } } },
      },
      invites: {
        orderBy: { createdAt: 'desc' },
      },
      auditLogs: {
        orderBy: { createdAt: 'desc' },
        take: 30,
      },
    },
  });

  if (!lead) return null;

  const [suppression, submissions, outboxAttempts, referralInvites] = await Promise.all([
    db.emailSuppression.findUnique({ where: { normalizedEmail: lead.normalizedEmail } }),
    db.surveySubmission.findMany({
      where: { normalizedEmail: lead.normalizedEmail },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        campaignId: true,
        status: true,
        designation: true,
        submittedAt: true,
        verifiedAt: true,
      },
    }),
    db.emailOutbox.findMany({
      where: { normalizedRecipient: lead.normalizedEmail },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        emailType: true,
        subject: true,
        status: true,
        attemptCount: true,
        maxAttempts: true,
        smtpResponse: true,
        lastError: true,
        sentAt: true,
        createdAt: true,
        templateVersion: true,
      },
    }),
    db.referralInvitation.findMany({
      where: { normalizedEmail: lead.normalizedEmail },
      orderBy: { invitedAt: 'desc' },
      include: {
        referralLink: {
          include: {
            createdBy: { select: { preferredName: true } },
          },
        },
      },
    }),
  ]);

  const timeline: Array<{ timestamp: string; kind: string; title: string; detail?: string }> = [];
  timeline.push({
    timestamp: lead.createdAt.toISOString(),
    kind: 'lead',
    title: `Lead created (${lead.source})`,
  });
  for (const inv of lead.invites) {
    timeline.push({
      timestamp: inv.createdAt.toISOString(),
      kind: 'invite',
      title: 'Survey invitation generated',
      detail: `Expires ${inv.expiresAt.toLocaleDateString()}`,
    });
    if (inv.openedAt) {
      timeline.push({
        timestamp: inv.openedAt.toISOString(),
        kind: 'visit',
        title: `Recorded survey page visit (${inv.openCount} total)`,
      });
    }
    if (inv.completedAt) {
      timeline.push({
        timestamp: inv.completedAt.toISOString(),
        kind: 'completed',
        title: 'Survey submission completed via invite link',
      });
    }
  }
  for (const ob of outboxAttempts) {
    timeline.push({
      timestamp: ob.createdAt.toISOString(),
      kind: 'email',
      title: `Email ${friendlyDeliveryLabel(ob.status)} (${ob.emailType})`,
      detail: ob.subject,
    });
  }
  for (const log of lead.auditLogs) {
    timeline.push({
      timestamp: log.createdAt.toISOString(),
      kind: 'audit',
      title: log.summary,
      detail: log.actorEmail || undefined,
    });
  }
  timeline.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return {
    lead: {
      ...lead,
      tags: parseTags(lead.tagsJson),
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      archivedAt: lead.archivedAt ? lead.archivedAt.toISOString() : null,
    },
    suppression,
    submissions,
    invites: lead.invites.map((i) => ({
      id: i.id,
      campaignId: i.campaignId,
      outboxId: i.outboxId,
      expiresAt: i.expiresAt.toISOString(),
      isExpired: i.expiresAt < new Date(),
      openedAt: i.openedAt ? i.openedAt.toISOString() : null,
      lastOpenedAt: i.lastOpenedAt ? i.lastOpenedAt.toISOString() : null,
      openCount: i.openCount,
      completedAt: i.completedAt ? i.completedAt.toISOString() : null,
      createdAt: i.createdAt.toISOString(),
    })),
    outboxAttempts: outboxAttempts.map((o) => ({
      ...o,
      friendlyStatus: friendlyDeliveryLabel(o.status),
      smtpResponse: redactTechnicalText(o.smtpResponse),
      lastError: redactTechnicalText(o.lastError),
      sentAt: o.sentAt ? o.sentAt.toISOString() : null,
      createdAt: o.createdAt.toISOString(),
    })),
    referrals: referralInvites.map((r) => ({
      id: r.id,
      status: r.status,
      invitedAt: r.invitedAt.toISOString(),
      referrerName: r.referralLink?.createdBy?.preferredName || 'Verified Participant',
    })),
    timeline,
  };
}

export async function previewOrDispatchInvitations(params: {
  mode: 'single' | 'manual_batch' | 'selected_ids' | 'all_matching';
  contacts?: Array<{ email: string; name?: string; institution?: string }>;
  leadIds?: string[];
  filters?: LeadFilterParams;
  campaignId?: string;
  templateType: 'pakistan_launch_invitation' | 'survey_invitation';
  expiryDays: number;
  allowResend: boolean;
  dryRun: boolean;
  queueOnly?: boolean;
  origin: string;
  actor: { id: string; email: string };
}) {
  const campaign = params.campaignId
    ? await db.surveyCampaign.findUnique({ where: { id: params.campaignId } })
    : await db.surveyCampaign.findFirst({ where: { status: 'active' }, orderBy: { createdAt: 'desc' } });

  if (!campaign) {
    throw new Error('Target survey campaign not found.');
  }

  let rawCandidates: Array<{
    leadId?: string;
    email: string;
    name: string;
    institution: string;
    source: string;
  }> = [];

  if (params.mode === 'single' || params.mode === 'manual_batch') {
    rawCandidates = (params.contacts || []).map((c) => ({
      email: c.email.trim(),
      name: c.name?.trim() || '',
      institution: c.institution?.trim() || '',
      source: 'manual',
    }));
  } else if (params.mode === 'selected_ids') {
    const rows = await db.leadContact.findMany({
      where: { id: { in: params.leadIds || [] }, isArchived: false },
      include: { institution: { select: { name: true } } },
    });
    rawCandidates = rows.map((r) => ({
      leadId: r.id,
      email: r.email,
      name: r.fullName || '',
      institution: r.institution?.name || r.institutionName || '',
      source: r.source,
    }));
  } else if (params.mode === 'all_matching') {
    const { where, impossible } = await buildLeadWhereClause({
      ...(params.filters || {}),
      archived: 'active',
    });
    if (!impossible) {
      const rows = await db.leadContact.findMany({
        where,
        take: 1000, // safe server ceiling per operation
        include: { institution: { select: { name: true } } },
      });
      rawCandidates = rows.map((r) => ({
        leadId: r.id,
        email: r.email,
        name: r.fullName || '',
        institution: r.institution?.name || r.institutionName || '',
        source: r.source,
      }));
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const seen = new Set<string>();
  const validCandidates: Array<{
    leadId?: string;
    email: string;
    normalized: string;
    name: string;
    institution: string;
    source: string;
  }> = [];
  let invalidOrDuplicateExcluded = 0;

  for (const c of rawCandidates) {
    const norm = normalizeEmail(c.email);
    if (!emailRegex.test(c.email) || seen.has(norm)) {
      invalidOrDuplicateExcluded++;
      continue;
    }
    seen.add(norm);
    validCandidates.push({ ...c, normalized: norm });
  }

  const normalizedList = validCandidates.map((c) => c.normalized);
  const [suppressions, verifiedSubs, existingInvites] = await Promise.all([
    normalizedList.length
      ? db.emailSuppression.findMany({ where: { normalizedEmail: { in: normalizedList } } })
      : [],
    normalizedList.length
      ? db.surveySubmission.findMany({
          where: {
            campaignId: campaign.id,
            normalizedEmail: { in: normalizedList },
            status: 'verified',
          },
          select: { normalizedEmail: true },
        })
      : [],
    normalizedList.length
      ? db.surveyLeadInvite.findMany({
          where: {
            campaignId: campaign.id,
            normalizedRecipient: { in: normalizedList },
          },
          select: { normalizedRecipient: true },
        })
      : [],
  ]);

  const supSet = new Set(suppressions.map((s) => s.normalizedEmail));
  const verifiedSet = new Set(verifiedSubs.map((v) => v.normalizedEmail));
  const invitedSet = new Set(existingInvites.map((i) => i.normalizedRecipient));

  let suppressedExcluded = 0;
  let alreadyVerifiedExcluded = 0;
  let previouslyInvitedExcluded = 0;
  const eligible: typeof validCandidates = [];

  for (const c of validCandidates) {
    if (supSet.has(c.normalized)) {
      suppressedExcluded++;
      continue;
    }
    if (verifiedSet.has(c.normalized)) {
      alreadyVerifiedExcluded++;
      continue;
    }
    if (!params.allowResend && invitedSet.has(c.normalized)) {
      previouslyInvitedExcluded++;
      continue;
    }
    eligible.push(c);
  }

  const review = {
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    totalInput: rawCandidates.length,
    eligibleCount: eligible.length,
    suppressedExcluded,
    alreadyVerifiedExcluded,
    previouslyInvitedExcluded,
    invalidOrDuplicateExcluded,
    finalToQueue: eligible.length,
  };

  if (params.dryRun) {
    return { dryRun: true, review, results: [] };
  }

  const baseSurveyUrl = `${params.origin}/surveys/${campaign.slug === 'pakistan-banking-expertise-map' ? 'pakistan-banking-map' : campaign.slug}`;
  const expiresAt = new Date(Date.now() + params.expiryDays * 86_400_000);
  const results: Array<{ email: string; status: string; success: boolean; message: string }> = [];

  // Queue immediately for batches > 5 so HTTP requests don't time out; worker/inline flush handles delivery
  const sendImmediately = !params.queueOnly && eligible.length <= 5;

  for (const c of eligible) {
    // Upsert LeadContact preserving original casing
    const lead = await db.leadContact.upsert({
      where: { normalizedEmail: c.normalized },
      update: {
        ...(c.name ? { fullName: c.name } : {}),
        ...(c.institution ? { institutionName: c.institution } : {}),
        updatedByUserId: params.actor.id,
      },
      create: {
        email: c.email,
        normalizedEmail: c.normalized,
        fullName: c.name || null,
        institutionName: c.institution || null,
        source: c.source || 'manual',
        createdByUserId: params.actor.id,
      },
    });

    await db.leadCampaignMembership.upsert({
      where: {
        leadId_campaignId: { leadId: lead.id, campaignId: campaign.id },
      },
      update: {},
      create: {
        leadId: lead.id,
        campaignId: campaign.id,
        assignedByUserId: params.actor.id,
      },
    });

    const rawToken = crypto.randomBytes(24).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const trackedUrl = `${baseSurveyUrl}?invite=${encodeURIComponent(rawToken)}`;
    const unsubscribeUrl = `${baseSurveyUrl}?optOut=${encodeURIComponent(c.email)}`;

    const baseKey = `admin-lead-invite:${campaign.id}:${params.templateType}:${c.normalized}`;
    const businessKey = params.allowResend ? `${baseKey}:${Date.now()}:${crypto.randomUUID().slice(0, 6)}` : baseKey;

    if (!params.allowResend) {
      await db.emailOutbox.deleteMany({
        where: { businessKey: baseKey, status: 'permanently_failed' },
      });
    }

    const dispatch = await enqueueAndSendEmail({
      businessKey,
      emailType: params.templateType,
      recipientEmail: c.email,
      recipientName: c.name,
      campaignId: campaign.id,
      containsSensitiveLink: true,
      payloadExpiresAt: expiresAt,
      sendImmediately,
      templateData: {
        preferred_name: c.name,
        institution_name: c.institution,
        survey_title: campaign.title,
        survey_url: trackedUrl,
        unsubscribe_url: unsubscribeUrl,
        expiry_minutes: String(params.expiryDays * 1440),
      },
    });

    if (dispatch.outboxId) {
      await db.surveyLeadInvite.create({
        data: {
          campaignId: campaign.id,
          leadId: lead.id,
          outboxId: dispatch.outboxId,
          recipientEmail: c.email,
          normalizedRecipient: c.normalized,
          recipientName: c.name || null,
          tokenHash,
          expiresAt,
        },
      });
    }

    await db.leadAuditLog.create({
      data: {
        leadId: lead.id,
        actorUserId: params.actor.id,
        actorEmail: params.actor.email,
        action: params.allowResend ? 'invite_resent' : 'invite_queued',
        summary: `${params.allowResend ? 'Resent' : 'Queued'} ${params.templateType} invitation (${dispatch.status}).`,
      },
    });

    results.push({
      email: c.email,
      status: dispatch.status,
      success: dispatch.success || dispatch.status === 'queued',
      message: dispatch.message,
    });
  }

  return { dryRun: false, review, results };
}
