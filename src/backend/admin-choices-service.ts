import { db } from './db';
import { PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG, SurveyDomainError } from './survey-service';
import { normalizeInstitutionName } from './survey-validation';

export interface AdminActor {
  userId: string;
  email: string;
}

export type ManagedEntityType =
  | 'institution'
  | 'institution_category'
  | 'expertise_category'
  | 'engagement_interest'
  | 'city';

function slugifyCode(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

function slugifyHyphen(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\r' && next === '\n') {
      row.push(cell.trim());
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      cell = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      row.push(cell.trim());
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  row.push(cell.trim());
  if (row.some((c) => c.length > 0)) rows.push(row);
  return rows;
}

async function recordAuditLog(params: {
  actor: AdminActor;
  entityType: string;
  entityId: string;
  action: string;
  changeClassification?: 'minor_label' | 'material_meaning' | 'lifecycle' | 'config';
  beforeValue?: unknown;
  afterValue?: unknown;
  notes?: string;
}) {
  await db.choiceAuditLog.create({
    data: {
      adminUserId: params.actor.userId,
      adminEmail: params.actor.email,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      changeClassification: params.changeClassification ?? 'config',
      beforeValue: params.beforeValue !== undefined ? JSON.stringify(params.beforeValue) : null,
      afterValue: params.afterValue !== undefined ? JSON.stringify(params.afterValue) : null,
      notes: params.notes ?? null,
    },
  });
}

export async function listChoiceManagementData(
  campaignSlug = PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG
) {
  const campaign = await db.surveyCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true, slug: true, title: true, status: true },
  });

  if (!campaign) {
    throw new SurveyDomainError('Survey campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');
  }

  const [
    categories,
    campaignCatSettings,
    institutions,
    expertiseCategories,
    engagementInterests,
    citiesSet,
    campaignChoiceAvailability,
    proposals,
    auditLogs,
  ] = await Promise.all([
    db.institutionCategory.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { institutions: true } },
      },
    }),
    db.campaignInstitutionCategory.findMany({
      where: { campaignId: campaign.id },
      select: { categoryId: true, isEnabled: true },
    }),
    db.institution.findMany({
      orderBy: [{ name: 'asc' }],
      include: {
        category: { select: { id: true, code: true, name: true, shortLabel: true } },
        successorInstitution: { select: { id: true, name: true, shortCode: true } },
        aliases: { orderBy: { alias: 'asc' } },
        _count: {
          select: {
            submissions: true,
            participants: true,
            predecessors: true,
          },
        },
      },
    }),
    db.expertiseCategory.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { rankedSelections: true } },
      },
    }),
    db.engagementInterest.findMany({
      orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
      include: {
        _count: { select: { submissions: true } },
      },
    }),
    db.surveyChoiceSet.findUnique({
      where: { code: 'cities' },
      include: {
        choices: {
          orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
          include: {
            _count: {
              select: {
                citySubmissions: true,
                cityParticipants: true,
              },
            },
          },
        },
      },
    }),
    db.campaignChoiceAvailability.findMany({
      where: { campaignId: campaign.id },
      select: {
        choiceId: true,
        expertiseCategoryId: true,
        engagementInterestId: true,
        isEnabled: true,
      },
    }),
    db.surveyOtherProposal.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 150,
      include: {
        submission: {
          select: {
            id: true,
            preferredName: true,
            officialEmail: true,
            institutionNameRaw: true,
            status: true,
            submittedAt: true,
          },
        },
      },
    }),
    db.choiceAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  const catEnabledMap = new Map(campaignCatSettings.map((c) => [c.categoryId, c.isEnabled]));
  const expEnabledMap = new Map(
    campaignChoiceAvailability
      .filter((c) => c.expertiseCategoryId)
      .map((c) => [c.expertiseCategoryId!, c.isEnabled])
  );
  const intEnabledMap = new Map(
    campaignChoiceAvailability
      .filter((c) => c.engagementInterestId)
      .map((c) => [c.engagementInterestId!, c.isEnabled])
  );
  const cityEnabledMap = new Map(
    campaignChoiceAvailability.filter((c) => c.choiceId).map((c) => [c.choiceId!, c.isEnabled])
  );

  return {
    campaign,
    institutionCategories: categories.map((c) => ({
      ...c,
      campaignEnabled: catEnabledMap.get(c.id) ?? true,
    })),
    institutions,
    expertiseCategories: expertiseCategories.map((e) => ({
      ...e,
      campaignEnabled: expEnabledMap.get(e.id) ?? true,
    })),
    engagementInterests: engagementInterests.map((i) => ({
      ...i,
      campaignEnabled: intEnabledMap.get(i.id) ?? true,
    })),
    cities: (citiesSet?.choices ?? []).map((city) => ({
      ...city,
      campaignEnabled: cityEnabledMap.get(city.id) ?? true,
    })),
    proposals,
    auditLogs,
  };
}

export async function createChoiceItem(
  actor: AdminActor,
  entityType: ManagedEntityType,
  payload: Record<string, unknown>,
  campaignSlug = PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG
) {
  const campaign = await db.surveyCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true },
  });

  if (entityType === 'institution') {
    const name = String(payload.name ?? '').trim();
    if (name.length < 2) {
      throw new SurveyDomainError('Institution name must be at least 2 characters.', 400);
    }
    const normalizedName = normalizeInstitutionName(name);
    const code = String(payload.code ?? '').trim() || slugifyCode(name);
    const shortCode = String(payload.shortCode ?? '').trim() || null;
    const categoryId = String(payload.categoryId ?? '').trim() || null;
    const operatingStatus = String(payload.operatingStatus ?? 'active').trim() || 'active';
    const statusNote = String(payload.statusNote ?? '').trim() || null;
    const isSelectable = payload.isSelectable !== undefined ? Boolean(payload.isSelectable) : true;
    const isHistorical = payload.isHistorical !== undefined ? Boolean(payload.isHistorical) : false;
    const sourceUrl = String(payload.sourceUrl ?? '').trim() || null;
    const aliasesInput = Array.isArray(payload.aliases)
      ? payload.aliases
      : typeof payload.aliases === 'string'
        ? payload.aliases.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

    const existing = await db.institution.findFirst({
      where: { OR: [{ normalizedName }, { code }] },
    });
    if (existing) {
      throw new SurveyDomainError(
        `An institution with this name or code ("${existing.name}") already exists.`,
        409,
        'DUPLICATE_INSTITUTION'
      );
    }

    const created = await db.institution.create({
      data: {
        code,
        name,
        normalizedName,
        shortCode,
        categoryId,
        operatingStatus,
        statusNote,
        isSelectable,
        isHistorical,
        sourceUrl,
        isActive: true,
      },
    });

    for (const rawAlias of aliasesInput) {
      const aliasStr =
        typeof rawAlias === 'string'
          ? rawAlias.trim()
          : String((rawAlias as { alias?: string })?.alias ?? '').trim();
      const aliasType =
        typeof rawAlias === 'object' && rawAlias !== null && 'aliasType' in rawAlias
          ? String((rawAlias as { aliasType?: string }).aliasType || 'abbreviation')
          : 'abbreviation';
      if (!aliasStr) continue;
      const normalizedAlias = normalizeInstitutionName(aliasStr);
      await db.institutionAlias.upsert({
        where: {
          institutionId_normalizedAlias: {
            institutionId: created.id,
            normalizedAlias,
          },
        },
        update: {},
        create: {
          institutionId: created.id,
          alias: aliasStr,
          normalizedAlias,
          aliasType,
        },
      });
    }

    await recordAuditLog({
      actor,
      entityType,
      entityId: created.id,
      action: 'create',
      changeClassification: 'config',
      afterValue: created,
    });
    return created;
  }

  if (entityType === 'institution_category') {
    const name = String(payload.name ?? '').trim();
    const shortLabel = String(payload.shortLabel ?? '').trim() || name;
    const code = String(payload.code ?? '').trim() || slugifyCode(name);
    if (name.length < 2) {
      throw new SurveyDomainError('Category name must be at least 2 characters.', 400);
    }

    const existing = await db.institutionCategory.findUnique({ where: { code } });
    if (existing) {
      throw new SurveyDomainError(`Category code "${code}" already exists.`, 409);
    }

    const created = await db.institutionCategory.create({
      data: {
        code,
        name,
        shortLabel,
        description: String(payload.description ?? '').trim() || null,
        displayOrder: Number(payload.displayOrder ?? 50),
        isCommercialBank: Boolean(payload.isCommercialBank),
        isActive: true,
      },
    });

    if (campaign) {
      await db.campaignInstitutionCategory.upsert({
        where: { campaignId_categoryId: { campaignId: campaign.id, categoryId: created.id } },
        update: { isEnabled: true },
        create: { campaignId: campaign.id, categoryId: created.id, isEnabled: true },
      });
    }

    await recordAuditLog({
      actor,
      entityType,
      entityId: created.id,
      action: 'create',
      changeClassification: 'config',
      afterValue: created,
    });
    return created;
  }

  if (entityType === 'expertise_category') {
    const name = String(payload.name ?? '').trim();
    const slug = String(payload.slug ?? '').trim() || slugifyHyphen(name);
    if (name.length < 2) {
      throw new SurveyDomainError('Expertise category name must be at least 2 characters.', 400);
    }

    const existing = await db.expertiseCategory.findUnique({ where: { slug } });
    if (existing) {
      throw new SurveyDomainError(`Expertise slug "${slug}" already exists.`, 409);
    }

    const created = await db.expertiseCategory.create({
      data: {
        slug,
        name,
        description: String(payload.description ?? '').trim() || null,
        displayOrder: Number(payload.displayOrder ?? 50),
        isOtherOption: Boolean(payload.isOtherOption),
        isActive: true,
      },
    });

    if (campaign) {
      await db.campaignChoiceAvailability.upsert({
        where: {
          campaignId_expertiseCategoryId: {
            campaignId: campaign.id,
            expertiseCategoryId: created.id,
          },
        },
        update: { isEnabled: true },
        create: {
          campaignId: campaign.id,
          expertiseCategoryId: created.id,
          isEnabled: true,
        },
      });
    }

    await recordAuditLog({
      actor,
      entityType,
      entityId: created.id,
      action: 'create',
      changeClassification: 'config',
      afterValue: created,
    });
    return created;
  }

  if (entityType === 'engagement_interest') {
    const label = String(payload.label ?? '').trim();
    const slug = String(payload.slug ?? '').trim() || slugifyHyphen(label);
    if (label.length < 2) {
      throw new SurveyDomainError('Engagement interest label must be at least 2 characters.', 400);
    }

    const existing = await db.engagementInterest.findUnique({ where: { slug } });
    if (existing) {
      throw new SurveyDomainError(`Engagement interest slug "${slug}" already exists.`, 409);
    }

    const created = await db.engagementInterest.create({
      data: {
        slug,
        label,
        description: String(payload.description ?? '').trim() || null,
        displayOrder: Number(payload.displayOrder ?? 50),
        isActive: true,
      },
    });

    if (campaign) {
      await db.campaignChoiceAvailability.upsert({
        where: {
          campaignId_engagementInterestId: {
            campaignId: campaign.id,
            engagementInterestId: created.id,
          },
        },
        update: { isEnabled: true },
        create: {
          campaignId: campaign.id,
          engagementInterestId: created.id,
          isEnabled: true,
        },
      });
    }

    await recordAuditLog({
      actor,
      entityType,
      entityId: created.id,
      action: 'create',
      changeClassification: 'config',
      afterValue: created,
    });
    return created;
  }

  // City choice item
  const label = String(payload.label ?? '').trim();
  if (label.length < 2) {
    throw new SurveyDomainError('City label must be at least 2 characters.', 400);
  }
  const code = String(payload.code ?? '').trim() || slugifyCode(label);
  const citiesSet = await db.surveyChoiceSet.upsert({
    where: { code: 'cities' },
    update: {},
    create: { code: 'cities', name: 'Cities' },
  });

  const existing = await db.surveyChoice.findUnique({
    where: { choiceSetId_code: { choiceSetId: citiesSet.id, code } },
  });
  if (existing) {
    throw new SurveyDomainError(`City code "${code}" already exists.`, 409);
  }

  const created = await db.surveyChoice.create({
    data: {
      choiceSetId: citiesSet.id,
      code,
      label,
      aliases: String(payload.aliases ?? '').trim() || null,
      displayOrder: Number(payload.displayOrder ?? 50),
      isOtherOption: Boolean(payload.isOtherOption),
      isActive: true,
    },
  });

  if (campaign) {
    await db.campaignChoiceAvailability.upsert({
      where: {
        campaignId_choiceId: {
          campaignId: campaign.id,
          choiceId: created.id,
        },
      },
      update: { isEnabled: true },
      create: { campaignId: campaign.id, choiceId: created.id, isEnabled: true },
    });
  }

  await recordAuditLog({
    actor,
    entityType,
    entityId: created.id,
    action: 'create',
    changeClassification: 'config',
    afterValue: created,
  });
  return created;
}

export async function updateChoiceItem(
  actor: AdminActor,
  entityType: ManagedEntityType,
  id: string,
  payload: Record<string, unknown>
) {
  const changeClassification =
    payload.changeClassification === 'material_meaning' ? 'material_meaning' : 'minor_label';

  if (entityType === 'institution') {
    const before = await db.institution.findUnique({
      where: { id },
      include: { aliases: true },
    });
    if (!before) throw new SurveyDomainError('Institution not found.', 404);

    const name = payload.name !== undefined ? String(payload.name).trim() : before.name;
    if (name.length < 2) throw new SurveyDomainError('Institution name is too short.', 400);

    const updated = await db.institution.update({
      where: { id },
      data: {
        name,
        normalizedName: normalizeInstitutionName(name),
        shortCode:
          payload.shortCode !== undefined ? String(payload.shortCode || '').trim() || null : before.shortCode,
        categoryId:
          payload.categoryId !== undefined ? String(payload.categoryId || '').trim() || null : before.categoryId,
        operatingStatus:
          payload.operatingStatus !== undefined
            ? String(payload.operatingStatus).trim()
            : before.operatingStatus,
        statusNote:
          payload.statusNote !== undefined ? String(payload.statusNote || '').trim() || null : before.statusNote,
        isSelectable:
          payload.isSelectable !== undefined ? Boolean(payload.isSelectable) : before.isSelectable,
        isHistorical:
          payload.isHistorical !== undefined ? Boolean(payload.isHistorical) : before.isHistorical,
        sourceUrl:
          payload.sourceUrl !== undefined ? String(payload.sourceUrl || '').trim() || null : before.sourceUrl,
      },
    });

    if (payload.aliases !== undefined) {
      const aliasList = Array.isArray(payload.aliases)
        ? payload.aliases
        : String(payload.aliases || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

      await db.institutionAlias.deleteMany({ where: { institutionId: id } });
      for (const rawAlias of aliasList) {
        const aliasStr =
          typeof rawAlias === 'string'
            ? rawAlias.trim()
            : String((rawAlias as { alias?: string })?.alias ?? '').trim();
        const aliasType =
          typeof rawAlias === 'object' && rawAlias !== null && 'aliasType' in rawAlias
            ? String((rawAlias as { aliasType?: string }).aliasType || 'abbreviation')
            : 'abbreviation';
        if (!aliasStr) continue;
        const normalizedAlias = normalizeInstitutionName(aliasStr);
        await db.institutionAlias.upsert({
          where: { institutionId_normalizedAlias: { institutionId: id, normalizedAlias } },
          update: {},
          create: {
            institutionId: id,
            alias: aliasStr,
            normalizedAlias,
            aliasType,
          },
        });
      }
    }

    await recordAuditLog({
      actor,
      entityType,
      entityId: id,
      action: 'update',
      changeClassification,
      beforeValue: before,
      afterValue: updated,
      notes: payload.notes ? String(payload.notes) : undefined,
    });
    return updated;
  }

  if (entityType === 'institution_category') {
    const before = await db.institutionCategory.findUnique({ where: { id } });
    if (!before) throw new SurveyDomainError('Category not found.', 404);
    const updated = await db.institutionCategory.update({
      where: { id },
      data: {
        name: payload.name !== undefined ? String(payload.name).trim() : before.name,
        shortLabel:
          payload.shortLabel !== undefined ? String(payload.shortLabel).trim() : before.shortLabel,
        description:
          payload.description !== undefined
            ? String(payload.description || '').trim() || null
            : before.description,
        displayOrder:
          payload.displayOrder !== undefined ? Number(payload.displayOrder) : before.displayOrder,
        isCommercialBank:
          payload.isCommercialBank !== undefined
            ? Boolean(payload.isCommercialBank)
            : before.isCommercialBank,
      },
    });
    await recordAuditLog({
      actor,
      entityType,
      entityId: id,
      action: 'update',
      changeClassification,
      beforeValue: before,
      afterValue: updated,
    });
    return updated;
  }

  if (entityType === 'expertise_category') {
    const before = await db.expertiseCategory.findUnique({ where: { id } });
    if (!before) throw new SurveyDomainError('Expertise category not found.', 404);
    const updated = await db.expertiseCategory.update({
      where: { id },
      data: {
        name: payload.name !== undefined ? String(payload.name).trim() : before.name,
        description:
          payload.description !== undefined
            ? String(payload.description || '').trim() || null
            : before.description,
        displayOrder:
          payload.displayOrder !== undefined ? Number(payload.displayOrder) : before.displayOrder,
        isOtherOption:
          payload.isOtherOption !== undefined ? Boolean(payload.isOtherOption) : before.isOtherOption,
      },
    });
    await recordAuditLog({
      actor,
      entityType,
      entityId: id,
      action: 'update',
      changeClassification,
      beforeValue: before,
      afterValue: updated,
    });
    return updated;
  }

  if (entityType === 'engagement_interest') {
    const before = await db.engagementInterest.findUnique({ where: { id } });
    if (!before) throw new SurveyDomainError('Engagement interest not found.', 404);
    const updated = await db.engagementInterest.update({
      where: { id },
      data: {
        label: payload.label !== undefined ? String(payload.label).trim() : before.label,
        description:
          payload.description !== undefined
            ? String(payload.description || '').trim() || null
            : before.description,
        displayOrder:
          payload.displayOrder !== undefined ? Number(payload.displayOrder) : before.displayOrder,
      },
    });
    await recordAuditLog({
      actor,
      entityType,
      entityId: id,
      action: 'update',
      changeClassification,
      beforeValue: before,
      afterValue: updated,
    });
    return updated;
  }

  const before = await db.surveyChoice.findUnique({ where: { id } });
  if (!before) throw new SurveyDomainError('City choice not found.', 404);
  const updated = await db.surveyChoice.update({
    where: { id },
    data: {
      label: payload.label !== undefined ? String(payload.label).trim() : before.label,
      aliases:
        payload.aliases !== undefined ? String(payload.aliases || '').trim() || null : before.aliases,
      displayOrder:
        payload.displayOrder !== undefined ? Number(payload.displayOrder) : before.displayOrder,
      isOtherOption:
        payload.isOtherOption !== undefined ? Boolean(payload.isOtherOption) : before.isOtherOption,
    },
  });
  await recordAuditLog({
    actor,
    entityType,
    entityId: id,
    action: 'update',
    changeClassification,
    beforeValue: before,
    afterValue: updated,
  });
  return updated;
}

export async function toggleChoiceActive(
  actor: AdminActor,
  entityType: ManagedEntityType,
  id: string,
  isActive: boolean
) {
  const action = isActive ? 'activate' : 'deactivate';
  if (entityType === 'institution') {
    const updated = await db.institution.update({ where: { id }, data: { isActive } });
    await recordAuditLog({
      actor,
      entityType,
      entityId: id,
      action,
      changeClassification: 'lifecycle',
      afterValue: { isActive },
    });
    return updated;
  }
  if (entityType === 'institution_category') {
    const updated = await db.institutionCategory.update({ where: { id }, data: { isActive } });
    await recordAuditLog({
      actor,
      entityType,
      entityId: id,
      action,
      changeClassification: 'lifecycle',
      afterValue: { isActive },
    });
    return updated;
  }
  if (entityType === 'expertise_category') {
    const updated = await db.expertiseCategory.update({ where: { id }, data: { isActive } });
    await recordAuditLog({
      actor,
      entityType,
      entityId: id,
      action,
      changeClassification: 'lifecycle',
      afterValue: { isActive },
    });
    return updated;
  }
  if (entityType === 'engagement_interest') {
    const updated = await db.engagementInterest.update({ where: { id }, data: { isActive } });
    await recordAuditLog({
      actor,
      entityType,
      entityId: id,
      action,
      changeClassification: 'lifecycle',
      afterValue: { isActive },
    });
    return updated;
  }
  const updated = await db.surveyChoice.update({ where: { id }, data: { isActive } });
  await recordAuditLog({
    actor,
    entityType,
    entityId: id,
    action,
    changeClassification: 'lifecycle',
    afterValue: { isActive },
  });
  return updated;
}

export async function toggleCampaignAvailability(
  actor: AdminActor,
  entityType: ManagedEntityType,
  id: string,
  isEnabled: boolean,
  campaignSlug = PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG
) {
  const campaign = await db.surveyCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true },
  });
  if (!campaign) throw new SurveyDomainError('Campaign not found.', 404);

  if (entityType === 'institution_category') {
    const saved = await db.campaignInstitutionCategory.upsert({
      where: { campaignId_categoryId: { campaignId: campaign.id, categoryId: id } },
      update: { isEnabled },
      create: { campaignId: campaign.id, categoryId: id, isEnabled },
    });
    await recordAuditLog({
      actor,
      entityType,
      entityId: id,
      action: 'campaign_toggle',
      changeClassification: 'config',
      afterValue: { campaignId: campaign.id, isEnabled },
    });
    return saved;
  }

  if (entityType === 'expertise_category') {
    const saved = await db.campaignChoiceAvailability.upsert({
      where: { campaignId_expertiseCategoryId: { campaignId: campaign.id, expertiseCategoryId: id } },
      update: { isEnabled },
      create: { campaignId: campaign.id, expertiseCategoryId: id, isEnabled },
    });
    await recordAuditLog({
      actor,
      entityType,
      entityId: id,
      action: 'campaign_toggle',
      changeClassification: 'config',
      afterValue: { campaignId: campaign.id, isEnabled },
    });
    return saved;
  }

  if (entityType === 'engagement_interest') {
    const saved = await db.campaignChoiceAvailability.upsert({
      where: {
        campaignId_engagementInterestId: { campaignId: campaign.id, engagementInterestId: id },
      },
      update: { isEnabled },
      create: { campaignId: campaign.id, engagementInterestId: id, isEnabled },
    });
    await recordAuditLog({
      actor,
      entityType,
      entityId: id,
      action: 'campaign_toggle',
      changeClassification: 'config',
      afterValue: { campaignId: campaign.id, isEnabled },
    });
    return saved;
  }

  if (entityType === 'city') {
    const saved = await db.campaignChoiceAvailability.upsert({
      where: { campaignId_choiceId: { campaignId: campaign.id, choiceId: id } },
      update: { isEnabled },
      create: { campaignId: campaign.id, choiceId: id, isEnabled },
    });
    await recordAuditLog({
      actor,
      entityType,
      entityId: id,
      action: 'campaign_toggle',
      changeClassification: 'config',
      afterValue: { campaignId: campaign.id, isEnabled },
    });
    return saved;
  }

  throw new SurveyDomainError('Campaign toggle is not supported for this entity type.', 400);
}

export async function reorderChoiceItems(
  actor: AdminActor,
  entityType: ManagedEntityType,
  orderedIds: string[]
) {
  await db.$transaction(async (tx) => {
    for (let idx = 0; idx < orderedIds.length; idx++) {
      const id = orderedIds[idx];
      const displayOrder = idx + 1;
      if (entityType === 'institution_category') {
        await tx.institutionCategory.update({ where: { id }, data: { displayOrder } });
      } else if (entityType === 'expertise_category') {
        await tx.expertiseCategory.update({ where: { id }, data: { displayOrder } });
      } else if (entityType === 'engagement_interest') {
        await tx.engagementInterest.update({ where: { id }, data: { displayOrder } });
      } else if (entityType === 'city') {
        await tx.surveyChoice.update({ where: { id }, data: { displayOrder } });
      } else if (entityType === 'institution') {
        await tx.institution.update({ where: { id }, data: { displayOrder } });
      }
    }
  });

  await recordAuditLog({
    actor,
    entityType,
    entityId: 'batch_reorder',
    action: 'reorder',
    changeClassification: 'config',
    afterValue: { orderedIds },
  });
}

export async function deleteChoiceItem(
  actor: AdminActor,
  entityType: ManagedEntityType,
  id: string
) {
  if (entityType === 'institution') {
    const counts = await db.institution.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: { select: { submissions: true, participants: true, predecessors: true } },
      },
    });
    if (!counts) throw new SurveyDomainError('Institution not found.', 404);
    const totalRefs =
      counts._count.submissions + counts._count.participants + counts._count.predecessors;
    if (totalRefs > 0) {
      throw new SurveyDomainError(
        `Cannot permanently delete "${counts.name}" because it is referenced by ${totalRefs} survey or historical records. Deactivate it instead.`,
        409,
        'CHOICE_IN_USE'
      );
    }
    await db.institution.delete({ where: { id } });
    await recordAuditLog({
      actor,
      entityType,
      entityId: id,
      action: 'delete',
      changeClassification: 'lifecycle',
      beforeValue: counts,
    });
    return;
  }

  if (entityType === 'institution_category') {
    const counts = await db.institutionCategory.findUnique({
      where: { id },
      select: { id: true, name: true, _count: { select: { institutions: true } } },
    });
    if (!counts) throw new SurveyDomainError('Category not found.', 404);
    if (counts._count.institutions > 0) {
      throw new SurveyDomainError(
        `Cannot permanently delete "${counts.name}" because ${counts._count.institutions} institutions belong to it. Reassign or deactivate instead.`,
        409,
        'CHOICE_IN_USE'
      );
    }
    await db.institutionCategory.delete({ where: { id } });
    await recordAuditLog({
      actor,
      entityType,
      entityId: id,
      action: 'delete',
      changeClassification: 'lifecycle',
      beforeValue: counts,
    });
    return;
  }

  if (entityType === 'expertise_category') {
    const counts = await db.expertiseCategory.findUnique({
      where: { id },
      select: { id: true, name: true, _count: { select: { rankedSelections: true } } },
    });
    if (!counts) throw new SurveyDomainError('Expertise category not found.', 404);
    if (counts._count.rankedSelections > 0) {
      throw new SurveyDomainError(
        `Cannot permanently delete "${counts.name}" because it has ${counts._count.rankedSelections} ranked survey selections. Deactivate it instead.`,
        409,
        'CHOICE_IN_USE'
      );
    }
    await db.expertiseCategory.delete({ where: { id } });
    await recordAuditLog({
      actor,
      entityType,
      entityId: id,
      action: 'delete',
      changeClassification: 'lifecycle',
      beforeValue: counts,
    });
    return;
  }

  if (entityType === 'engagement_interest') {
    const counts = await db.engagementInterest.findUnique({
      where: { id },
      select: { id: true, label: true, _count: { select: { submissions: true } } },
    });
    if (!counts) throw new SurveyDomainError('Engagement interest not found.', 404);
    if (counts._count.submissions > 0) {
      throw new SurveyDomainError(
        `Cannot permanently delete "${counts.label}" because it has ${counts._count.submissions} survey selections. Deactivate it instead.`,
        409,
        'CHOICE_IN_USE'
      );
    }
    await db.engagementInterest.delete({ where: { id } });
    await recordAuditLog({
      actor,
      entityType,
      entityId: id,
      action: 'delete',
      changeClassification: 'lifecycle',
      beforeValue: counts,
    });
    return;
  }

  const counts = await db.surveyChoice.findUnique({
    where: { id },
    select: {
      id: true,
      label: true,
      _count: { select: { citySubmissions: true, cityParticipants: true } },
    },
  });
  if (!counts) throw new SurveyDomainError('City choice not found.', 404);
  const totalRefs = counts._count.citySubmissions + counts._count.cityParticipants;
  if (totalRefs > 0) {
    throw new SurveyDomainError(
      `Cannot permanently delete "${counts.label}" because it is referenced by ${totalRefs} survey records. Deactivate it instead.`,
      409,
      'CHOICE_IN_USE'
    );
  }
  await db.surveyChoice.delete({ where: { id } });
  await recordAuditLog({
    actor,
    entityType,
    entityId: id,
    action: 'delete',
    changeClassification: 'lifecycle',
    beforeValue: counts,
  });
}

export async function mergeInstitutions(
  actor: AdminActor,
  sourceInstitutionId: string,
  targetInstitutionId: string,
  previewOnly: boolean
) {
  if (sourceInstitutionId === targetInstitutionId) {
    throw new SurveyDomainError('Source and target institutions must be different.', 400);
  }

  const [source, target] = await Promise.all([
    db.institution.findUnique({
      where: { id: sourceInstitutionId },
      include: {
        aliases: true,
        _count: { select: { submissions: true, participants: true } },
      },
    }),
    db.institution.findUnique({
      where: { id: targetInstitutionId },
      include: { aliases: true },
    }),
  ]);

  if (!source || !target) {
    throw new SurveyDomainError('Source or target institution not found.', 404);
  }

  const previewSummary = {
    source: { id: source.id, name: source.name },
    target: { id: target.id, name: target.name },
    submissionsToReassign: source._count.submissions,
    participantsToReassign: source._count.participants,
    aliasesToTransfer: source.aliases.length + 1,
    preservesInstitutionNameRaw: true,
  };

  if (previewOnly) {
    return { preview: true, summary: previewSummary };
  }

  await db.$transaction(async (tx) => {
    await tx.surveySubmission.updateMany({
      where: { institutionId: source.id },
      data: { institutionId: target.id },
    });
    await tx.surveyParticipant.updateMany({
      where: { institutionId: source.id },
      data: { institutionId: target.id },
    });

    const aliasesToCopy = [
      { alias: source.name, aliasType: 'former_name' },
      ...source.aliases.map((a) => ({ alias: a.alias, aliasType: a.aliasType })),
    ];

    for (const aliasDef of aliasesToCopy) {
      const normalizedAlias = normalizeInstitutionName(aliasDef.alias);
      await tx.institutionAlias.upsert({
        where: {
          institutionId_normalizedAlias: {
            institutionId: target.id,
            normalizedAlias,
          },
        },
        update: {},
        create: {
          institutionId: target.id,
          alias: aliasDef.alias,
          normalizedAlias,
          aliasType: aliasDef.aliasType,
        },
      });
    }

    await tx.institution.update({
      where: { id: source.id },
      data: {
        isActive: false,
        isSelectable: false,
        successorInstitutionId: target.id,
      },
    });
  });

  await recordAuditLog({
    actor,
    entityType: 'institution',
    entityId: source.id,
    action: 'merge_execute',
    changeClassification: 'material_meaning',
    beforeValue: { sourceId: source.id, sourceName: source.name },
    afterValue: previewSummary,
  });

  return { preview: false, summary: previewSummary };
}

export async function resolveOtherProposal(
  actor: AdminActor,
  params: {
    proposalId: string;
    action: 'approve_new' | 'map_existing' | 'reject';
    canonicalName?: string;
    shortCode?: string;
    categoryId?: string;
    targetId?: string;
    addAlias?: boolean;
    reviewNotes?: string;
  }
) {
  const proposal = await db.surveyOtherProposal.findUnique({
    where: { id: params.proposalId },
    include: { submission: true },
  });
  if (!proposal) throw new SurveyDomainError('Proposal not found.', 404);

  const now = new Date();

  if (params.action === 'reject') {
    const updated = await db.surveyOtherProposal.update({
      where: { id: proposal.id },
      data: {
        status: 'rejected',
        reviewedByAdminId: actor.userId,
        reviewedAt: now,
        reviewNotes: params.reviewNotes?.trim() || null,
      },
    });
    await recordAuditLog({
      actor,
      entityType: 'other_proposal',
      entityId: proposal.id,
      action: 'proposal_resolve',
      changeClassification: 'lifecycle',
      beforeValue: proposal,
      afterValue: updated,
    });
    return updated;
  }

  if (proposal.proposalType === 'institution') {
    if (params.action === 'approve_new') {
      const name = (params.canonicalName || proposal.submittedText).trim();
      const created = await createChoiceItem(actor, 'institution', {
        name,
        shortCode: params.shortCode,
        categoryId: params.categoryId,
        operatingStatus: 'active',
        isSelectable: true,
        isHistorical: false,
      });

      const updated = await db.$transaction(async (tx) => {
        await tx.surveySubmission.update({
          where: { id: proposal.submissionId },
          data: { institutionId: created.id },
        });
        if (proposal.submission.participantId) {
          await tx.surveyParticipant.update({
            where: { id: proposal.submission.participantId },
            data: { institutionId: created.id },
          });
        }
        return tx.surveyOtherProposal.update({
          where: { id: proposal.id },
          data: {
            status: 'approved_new',
            mappedInstitutionId: created.id,
            reviewedByAdminId: actor.userId,
            reviewedAt: now,
            reviewNotes: params.reviewNotes?.trim() || null,
          },
        });
      });

      await recordAuditLog({
        actor,
        entityType: 'other_proposal',
        entityId: proposal.id,
        action: 'proposal_resolve',
        changeClassification: 'material_meaning',
        beforeValue: proposal,
        afterValue: updated,
      });
      return updated;
    }

    if (!params.targetId) {
      throw new SurveyDomainError('Please select a target institution to map to.', 400);
    }
    const targetInst = await db.institution.findUnique({ where: { id: params.targetId } });
    if (!targetInst) throw new SurveyDomainError('Target institution not found.', 404);

    const updated = await db.$transaction(async (tx) => {
      await tx.surveySubmission.update({
        where: { id: proposal.submissionId },
        data: { institutionId: targetInst.id },
      });
      if (proposal.submission.participantId) {
        await tx.surveyParticipant.update({
          where: { id: proposal.submission.participantId },
          data: { institutionId: targetInst.id },
        });
      }
      if (params.addAlias) {
        const normalizedAlias = normalizeInstitutionName(proposal.submittedText);
        await tx.institutionAlias.upsert({
          where: {
            institutionId_normalizedAlias: {
              institutionId: targetInst.id,
              normalizedAlias,
            },
          },
          update: {},
          create: {
            institutionId: targetInst.id,
            alias: proposal.submittedText,
            normalizedAlias,
            aliasType: 'brand_alias',
          },
        });
      }
      return tx.surveyOtherProposal.update({
        where: { id: proposal.id },
        data: {
          status: 'mapped_existing',
          mappedInstitutionId: targetInst.id,
          reviewedByAdminId: actor.userId,
          reviewedAt: now,
          reviewNotes: params.reviewNotes?.trim() || null,
        },
      });
    });

    await recordAuditLog({
      actor,
      entityType: 'other_proposal',
      entityId: proposal.id,
      action: 'proposal_resolve',
      changeClassification: 'material_meaning',
      beforeValue: proposal,
      afterValue: updated,
    });
    return updated;
  }

  if (proposal.proposalType === 'city') {
    if (params.action === 'approve_new') {
      const label = (params.canonicalName || proposal.submittedText).trim();
      const created = await createChoiceItem(actor, 'city', { label });
      const updated = await db.$transaction(async (tx) => {
        await tx.surveySubmission.update({
          where: { id: proposal.submissionId },
          data: { cityId: created.id },
        });
        return tx.surveyOtherProposal.update({
          where: { id: proposal.id },
          data: {
            status: 'approved_new',
            mappedChoiceId: created.id,
            reviewedByAdminId: actor.userId,
            reviewedAt: now,
            reviewNotes: params.reviewNotes?.trim() || null,
          },
        });
      });
      return updated;
    }

    if (!params.targetId) {
      throw new SurveyDomainError('Please select a target city to map to.', 400);
    }
    const updated = await db.$transaction(async (tx) => {
      await tx.surveySubmission.update({
        where: { id: proposal.submissionId },
        data: { cityId: params.targetId },
      });
      return tx.surveyOtherProposal.update({
        where: { id: proposal.id },
        data: {
          status: 'mapped_existing',
          mappedChoiceId: params.targetId,
          reviewedByAdminId: actor.userId,
          reviewedAt: now,
          reviewNotes: params.reviewNotes?.trim() || null,
        },
      });
    });
    return updated;
  }

  // expertise proposal
  if (params.action === 'approve_new') {
    const name = (params.canonicalName || proposal.submittedText).trim();
    const created = await createChoiceItem(actor, 'expertise_category', { name });
    return db.surveyOtherProposal.update({
      where: { id: proposal.id },
      data: {
        status: 'approved_new',
        mappedExpertiseId: created.id,
        reviewedByAdminId: actor.userId,
        reviewedAt: now,
        reviewNotes: params.reviewNotes?.trim() || null,
      },
    });
  }

  if (!params.targetId) {
    throw new SurveyDomainError('Please select a target expertise category to map to.', 400);
  }
  return db.surveyOtherProposal.update({
    where: { id: proposal.id },
    data: {
      status: 'mapped_existing',
      mappedExpertiseId: params.targetId,
      reviewedByAdminId: actor.userId,
      reviewedAt: now,
      reviewNotes: params.reviewNotes?.trim() || null,
    },
  });
}

export async function exportChoicesCsv(entityType: ManagedEntityType): Promise<string> {
  if (entityType === 'institution') {
    const rows = await db.institution.findMany({
      orderBy: [{ name: 'asc' }],
      include: { category: { select: { code: true } }, aliases: true },
    });
    const header = [
      'code',
      'name',
      'shortCode',
      'categoryCode',
      'operatingStatus',
      'isSelectable',
      'isHistorical',
      'isActive',
      'aliases',
      'statusNote',
    ];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.code ?? '',
          r.name,
          r.shortCode ?? '',
          r.category?.code ?? '',
          r.operatingStatus,
          r.isSelectable,
          r.isHistorical,
          r.isActive,
          r.aliases.map((a) => a.alias).join('; '),
          r.statusNote ?? '',
        ]
          .map(escapeCsvCell)
          .join(',')
      );
    }
    return lines.join('\n');
  }

  if (entityType === 'expertise_category') {
    const rows = await db.expertiseCategory.findMany({ orderBy: [{ displayOrder: 'asc' }] });
    const header = ['slug', 'name', 'description', 'displayOrder', 'isActive', 'isOtherOption'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [r.slug, r.name, r.description ?? '', r.displayOrder, r.isActive, r.isOtherOption]
          .map(escapeCsvCell)
          .join(',')
      );
    }
    return lines.join('\n');
  }

  if (entityType === 'engagement_interest') {
    const rows = await db.engagementInterest.findMany({ orderBy: [{ displayOrder: 'asc' }] });
    const header = ['slug', 'label', 'description', 'displayOrder', 'isActive'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [r.slug, r.label, r.description ?? '', r.displayOrder, r.isActive]
          .map(escapeCsvCell)
          .join(',')
      );
    }
    return lines.join('\n');
  }

  const rows = await db.surveyChoice.findMany({
    where: { choiceSet: { code: 'cities' } },
    orderBy: [{ displayOrder: 'asc' }],
  });
  const header = ['code', 'label', 'aliases', 'displayOrder', 'isActive', 'isOtherOption'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [r.code, r.label, r.aliases ?? '', r.displayOrder, r.isActive, r.isOtherOption]
        .map(escapeCsvCell)
        .join(',')
    );
  }
  return lines.join('\n');
}

export interface CsvImportPreviewRow {
  rowNumber: number;
  key: string;
  label: string;
  action: 'create' | 'update' | 'error';
  error?: string;
  data: Record<string, string>;
}

export async function previewCsvImport(entityType: ManagedEntityType, csvText: string) {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    throw new SurveyDomainError('CSV must include a header row and at least one data row.', 400);
  }

  const headers = rows[0].map((h) => h.trim());
  const seenKeys = new Set<string>();
  const previewRows: CsvImportPreviewRow[] = [];

  if (entityType === 'institution') {
    const existing = await db.institution.findMany({
      select: { code: true, normalizedName: true },
    });
    const categories = await db.institutionCategory.findMany({ select: { code: true } });
    const validCatCodes = new Set(categories.map((c) => c.code));
    const existingCodes = new Set(existing.map((e) => e.code).filter(Boolean));
    const existingNames = new Set(existing.map((e) => e.normalizedName));

    for (let i = 1; i < rows.length; i++) {
      const record: Record<string, string> = {};
      headers.forEach((h, idx) => {
        record[h] = rows[i][idx] ?? '';
      });
      const name = (record.name || '').trim();
      const code = (record.code || slugifyCode(name)).trim();
      const catCode = (record.categoryCode || '').trim();

      let action: 'create' | 'update' | 'error' = 'create';
      let error: string | undefined;

      if (!name || name.length < 2) {
        action = 'error';
        error = 'Missing or too-short institution name';
      } else if (seenKeys.has(code)) {
        action = 'error';
        error = `Duplicate code "${code}" inside CSV`;
      } else if (catCode && !validCatCodes.has(catCode)) {
        action = 'error';
        error = `Unknown categoryCode "${catCode}"`;
      } else if (existingCodes.has(code) || existingNames.has(normalizeInstitutionName(name))) {
        action = 'update';
      }

      seenKeys.add(code);
      previewRows.push({ rowNumber: i + 1, key: code, label: name, action, error, data: record });
    }
  } else {
    const existingKeys = new Set<string>();
    if (entityType === 'expertise_category') {
      const items = await db.expertiseCategory.findMany({ select: { slug: true } });
      items.forEach((it) => existingKeys.add(it.slug));
    } else if (entityType === 'engagement_interest') {
      const items = await db.engagementInterest.findMany({ select: { slug: true } });
      items.forEach((it) => existingKeys.add(it.slug));
    } else if (entityType === 'city') {
      const items = await db.surveyChoice.findMany({
        where: { choiceSet: { code: 'cities' } },
        select: { code: true },
      });
      items.forEach((it) => existingKeys.add(it.code));
    }

    for (let i = 1; i < rows.length; i++) {
      const record: Record<string, string> = {};
      headers.forEach((h, idx) => {
        record[h] = rows[i][idx] ?? '';
      });
      const label = (record.name || record.label || '').trim();
      const key = (record.slug || record.code || slugifyHyphen(label)).trim();
      let action: 'create' | 'update' | 'error' = 'create';
      let error: string | undefined;

      if (!label || label.length < 2) {
        action = 'error';
        error = 'Missing or too-short label/name';
      } else if (seenKeys.has(key)) {
        action = 'error';
        error = `Duplicate key "${key}" inside CSV`;
      } else if (existingKeys.has(key)) {
        action = 'update';
      }

      seenKeys.add(key);
      previewRows.push({ rowNumber: i + 1, key, label, action, error, data: record });
    }
  }

  return {
    entityType,
    totalRows: previewRows.length,
    creates: previewRows.filter((r) => r.action === 'create').length,
    updates: previewRows.filter((r) => r.action === 'update').length,
    errors: previewRows.filter((r) => r.action === 'error').length,
    rows: previewRows,
  };
}

export async function applyCsvImport(
  actor: AdminActor,
  entityType: ManagedEntityType,
  csvText: string
) {
  const preview = await previewCsvImport(entityType, csvText);
  if (preview.errors > 0) {
    throw new SurveyDomainError(
      `CSV contains ${preview.errors} validation error(s). Please fix them before importing.`,
      400,
      'CSV_VALIDATION_ERROR'
    );
  }

  if (entityType === 'institution') {
    const categories = await db.institutionCategory.findMany({ select: { id: true, code: true } });
    const catIdByCode = new Map(categories.map((c) => [c.code, c.id]));

    for (const row of preview.rows) {
      const d = row.data;
      const name = d.name.trim();
      const normalizedName = normalizeInstitutionName(name);
      const categoryId = d.categoryCode ? catIdByCode.get(d.categoryCode.trim()) ?? null : null;
      const isActive = d.isActive ? d.isActive.toLowerCase() !== 'false' : true;
      const isSelectable = d.isSelectable ? d.isSelectable.toLowerCase() !== 'false' : true;
      const isHistorical = d.isHistorical ? d.isHistorical.toLowerCase() === 'true' : false;

      const existing = await db.institution.findFirst({
        where: { OR: [{ code: row.key }, { normalizedName }] },
      });

      const saved = existing
        ? await db.institution.update({
            where: { id: existing.id },
            data: {
              name,
              normalizedName,
              shortCode: d.shortCode?.trim() || existing.shortCode,
              categoryId: categoryId ?? existing.categoryId,
              operatingStatus: d.operatingStatus?.trim() || existing.operatingStatus,
              statusNote: d.statusNote?.trim() || existing.statusNote,
              isSelectable,
              isHistorical,
              isActive,
            },
          })
        : await db.institution.create({
            data: {
              code: row.key,
              name,
              normalizedName,
              shortCode: d.shortCode?.trim() || null,
              categoryId,
              operatingStatus: d.operatingStatus?.trim() || 'active',
              statusNote: d.statusNote?.trim() || null,
              isSelectable,
              isHistorical,
              isActive,
            },
          });

      if (d.aliases) {
        for (const rawAlias of d.aliases.split(';').map((s) => s.trim()).filter(Boolean)) {
          const normalizedAlias = normalizeInstitutionName(rawAlias);
          await db.institutionAlias.upsert({
            where: { institutionId_normalizedAlias: { institutionId: saved.id, normalizedAlias } },
            update: {},
            create: {
              institutionId: saved.id,
              alias: rawAlias,
              normalizedAlias,
              aliasType: 'abbreviation',
            },
          });
        }
      }
    }
  } else if (entityType === 'expertise_category') {
    for (const row of preview.rows) {
      const d = row.data;
      await db.expertiseCategory.upsert({
        where: { slug: row.key },
        update: {
          name: row.label,
          description: d.description?.trim() || null,
          displayOrder: Number(d.displayOrder || 50),
          isActive: d.isActive ? d.isActive.toLowerCase() !== 'false' : true,
        },
        create: {
          slug: row.key,
          name: row.label,
          description: d.description?.trim() || null,
          displayOrder: Number(d.displayOrder || 50),
          isActive: d.isActive ? d.isActive.toLowerCase() !== 'false' : true,
          isOtherOption: d.isOtherOption?.toLowerCase() === 'true',
        },
      });
    }
  } else if (entityType === 'engagement_interest') {
    for (const row of preview.rows) {
      const d = row.data;
      await db.engagementInterest.upsert({
        where: { slug: row.key },
        update: {
          label: row.label,
          description: d.description?.trim() || null,
          displayOrder: Number(d.displayOrder || 50),
          isActive: d.isActive ? d.isActive.toLowerCase() !== 'false' : true,
        },
        create: {
          slug: row.key,
          label: row.label,
          description: d.description?.trim() || null,
          displayOrder: Number(d.displayOrder || 50),
          isActive: d.isActive ? d.isActive.toLowerCase() !== 'false' : true,
        },
      });
    }
  } else if (entityType === 'city') {
    const citiesSet = await db.surveyChoiceSet.upsert({
      where: { code: 'cities' },
      update: {},
      create: { code: 'cities', name: 'Cities' },
    });
    for (const row of preview.rows) {
      const d = row.data;
      await db.surveyChoice.upsert({
        where: { choiceSetId_code: { choiceSetId: citiesSet.id, code: row.key } },
        update: {
          label: row.label,
          aliases: d.aliases?.trim() || null,
          displayOrder: Number(d.displayOrder || 50),
          isActive: d.isActive ? d.isActive.toLowerCase() !== 'false' : true,
        },
        create: {
          choiceSetId: citiesSet.id,
          code: row.key,
          label: row.label,
          aliases: d.aliases?.trim() || null,
          displayOrder: Number(d.displayOrder || 50),
          isActive: d.isActive ? d.isActive.toLowerCase() !== 'false' : true,
          isOtherOption: d.isOtherOption?.toLowerCase() === 'true',
        },
      });
    }
  }

  await recordAuditLog({
    actor,
    entityType: 'csv_import',
    entityId: entityType,
    action: 'csv_import',
    changeClassification: 'config',
    afterValue: { creates: preview.creates, updates: preview.updates, totalRows: preview.totalRows },
  });

  return preview;
}
