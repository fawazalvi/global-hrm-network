import { PrismaClient } from '@prisma/client';
import {
  SEED_CITIES,
  SEED_EXPERTISE_CHOICES,
  SEED_INSTITUTION_CATEGORIES,
  SEED_INSTITUTIONS,
  SEED_VERIFIED_DATE,
} from './seed-directory-data';

const prisma = new PrismaClient();

const hrExpertiseAreas = [
  'Talent Acquisition',
  'Employee Relations',
  'Compensation & Benefits',
  'HRIS & Technology',
  'Learning & Development',
  'Organizational Development',
  'DEI (Diversity, Equity & Inclusion)',
  'HR Strategy & Business Partnership',
  'Performance Management',
  'HR Analytics & Reporting',
  'Compliance & Legal',
  'Global & International HR',
  'Change Management',
  'Workforce Planning',
  'Mergers & Acquisitions (M&A)',
];

const engagementInterests = [
  {
    slug: 'benchmarking-reports',
    label: 'Receive Pakistan Banking Expertise Map insights & summary report',
    description: 'Receive aggregated, anonymized findings once the study concludes.',
    displayOrder: 1,
  },
  {
    slug: 'executive-roundtables',
    label: 'Executive roundtables & peer working groups',
    description: 'Participate in invitation-only banking leadership discussions.',
    displayOrder: 2,
  },
  {
    slug: 'advisory-panels',
    label: 'Thought leadership & advisory panels',
    description: 'Contribute domain perspectives to industry whitepapers and panels.',
    displayOrder: 3,
  },
  {
    slug: 'capability-exchange',
    label: 'Cross-bank HR & capability benchmarking',
    description: 'Collaborate on capability frameworks and role taxonomy standards.',
    displayOrder: 4,
  },
  {
    slug: 'future-research',
    label: 'Future Global HRM Network research studies',
    description: 'Be invited to participate in upcoming regional and sector surveys.',
    displayOrder: 5,
  },
];

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function main() {
  console.log('Seeding Global HRM Network reference data & Pakistan Banking Directory...');

  // 1. HR Expertise Areas (idempotent: update: {})
  for (const name of hrExpertiseAreas) {
    await prisma.hRExpertise.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 2. Global Config
  await prisma.globalConfig.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      logoUrl: '',
    },
  });

  // 3. Default Survey Campaign (idempotent: update: {})
  const campaign = await prisma.surveyCampaign.upsert({
    where: { slug: 'pakistan-banking-expertise-map' },
    update: {},
    create: {
      slug: 'pakistan-banking-expertise-map',
      title: 'Pakistan Banking Expertise Map',
      description:
        'Mapping domain expertise, leadership capabilities, and strategic priorities across Pakistan’s banking sector.',
      status: 'active',
    },
  });

  // 4. Institution Categories & Campaign Enablement
  const categoryIdByCode = new Map<string, string>();
  for (const cat of SEED_INSTITUTION_CATEGORIES) {
    const savedCat = await prisma.institutionCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: {
        code: cat.code,
        name: cat.name,
        shortLabel: cat.shortLabel,
        description: cat.description,
        displayOrder: cat.displayOrder,
        isCommercialBank: cat.isCommercialBank,
        isActive: true,
      },
    });
    categoryIdByCode.set(cat.code, savedCat.id);

    await prisma.campaignInstitutionCategory.upsert({
      where: {
        campaignId_categoryId: {
          campaignId: campaign.id,
          categoryId: savedCat.id,
        },
      },
      update: {},
      create: {
        campaignId: campaign.id,
        categoryId: savedCat.id,
        isEnabled: cat.code !== 'historical',
      },
    });
  }

  // 5. Institutions & Aliases (idempotent: update: {})
  const institutionIdByCode = new Map<string, string>();
  for (let idx = 0; idx < SEED_INSTITUTIONS.length; idx++) {
    const inst = SEED_INSTITUTIONS[idx];
    const categoryId = categoryIdByCode.get(inst.categoryCode) ?? null;
    const normalizedName = normalizeText(inst.name);

    // Check by code first, fallback to normalizedName if pre-existing
    const existingByCode = await prisma.institution.findUnique({ where: { code: inst.code } });
    const existingByName = existingByCode
      ? existingByCode
      : await prisma.institution.findUnique({ where: { normalizedName } });

    let savedInstId: string;
    if (existingByName) {
      savedInstId = existingByName.id;
      // Only backfill code/categoryId if missing so admin edits are preserved
      if (!existingByName.code) {
        await prisma.institution.update({
          where: { id: existingByName.id },
          data: {
            code: inst.code,
            categoryId: existingByName.categoryId ?? categoryId,
          },
        });
      }
    } else {
      const created = await prisma.institution.create({
        data: {
          code: inst.code,
          name: inst.name,
          normalizedName,
          shortCode: inst.shortCode ?? null,
          categoryId,
          operatingStatus: inst.operatingStatus,
          statusNote: inst.statusNote ?? null,
          isSelectable: inst.isSelectable,
          isHistorical: inst.isHistorical,
          sourceUrl: inst.sourceUrl,
          lastVerifiedAt: SEED_VERIFIED_DATE,
          displayOrder: idx + 1,
          country: 'Pakistan',
          isActive: true,
        },
      });
      savedInstId = created.id;
    }

    institutionIdByCode.set(inst.code, savedInstId);

    for (const aliasDef of inst.aliases) {
      const normalizedAlias = normalizeText(aliasDef.alias);
      await prisma.institutionAlias.upsert({
        where: {
          institutionId_normalizedAlias: {
            institutionId: savedInstId,
            normalizedAlias,
          },
        },
        update: {},
        create: {
          institutionId: savedInstId,
          alias: aliasDef.alias,
          normalizedAlias,
          aliasType: aliasDef.aliasType,
        },
      });
    }
  }

  // Link successor relationships for historical institutions (only if unset)
  for (const inst of SEED_INSTITUTIONS) {
    if (!inst.successorCode) continue;
    const instId = institutionIdByCode.get(inst.code);
    const successorId = institutionIdByCode.get(inst.successorCode);
    if (!instId || !successorId) continue;

    const current = await prisma.institution.findUnique({
      where: { id: instId },
      select: { successorInstitutionId: true },
    });
    if (current && !current.successorInstitutionId) {
      await prisma.institution.update({
        where: { id: instId },
        data: { successorInstitutionId: successorId },
      });
    }
  }

  // 6. Expertise Categories (16 items, idempotent: update: {})
  for (const exp of SEED_EXPERTISE_CHOICES) {
    const savedExp = await prisma.expertiseCategory.upsert({
      where: { slug: exp.slug },
      update: {},
      create: {
        slug: exp.slug,
        name: exp.name,
        displayOrder: exp.displayOrder,
        isActive: true,
        isOtherOption: exp.isOtherOption,
      },
    });

    await prisma.campaignChoiceAvailability.upsert({
      where: {
        campaignId_expertiseCategoryId: {
          campaignId: campaign.id,
          expertiseCategoryId: savedExp.id,
        },
      },
      update: {},
      create: {
        campaignId: campaign.id,
        expertiseCategoryId: savedExp.id,
        isEnabled: true,
      },
    });
  }

  // 7. Engagement Interests (idempotent: update: {})
  for (const interest of engagementInterests) {
    const savedInterest = await prisma.engagementInterest.upsert({
      where: { slug: interest.slug },
      update: {},
      create: {
        slug: interest.slug,
        label: interest.label,
        description: interest.description,
        displayOrder: interest.displayOrder,
        isActive: true,
      },
    });

    await prisma.campaignChoiceAvailability.upsert({
      where: {
        campaignId_engagementInterestId: {
          campaignId: campaign.id,
          engagementInterestId: savedInterest.id,
        },
      },
      update: {},
      create: {
        campaignId: campaign.id,
        engagementInterestId: savedInterest.id,
        isEnabled: true,
      },
    });
  }

  // 8. Cities Choice Set & Items (idempotent: update: {})
  const citiesSet = await prisma.surveyChoiceSet.upsert({
    where: { code: 'cities' },
    update: {},
    create: {
      code: 'cities',
      name: 'Cities',
      description: 'Primary work cities for survey participants.',
    },
  });

  for (const city of SEED_CITIES) {
    const savedCity = await prisma.surveyChoice.upsert({
      where: {
        choiceSetId_code: {
          choiceSetId: citiesSet.id,
          code: city.code,
        },
      },
      update: {},
      create: {
        choiceSetId: citiesSet.id,
        code: city.code,
        label: city.label,
        displayOrder: city.displayOrder,
        isActive: true,
        isOtherOption: city.isOtherOption,
      },
    });

    await prisma.campaignChoiceAvailability.upsert({
      where: {
        campaignId_choiceId: {
          campaignId: campaign.id,
          choiceId: savedCity.id,
        },
      },
      update: {},
      create: {
        campaignId: campaign.id,
        choiceId: savedCity.id,
        isEnabled: true,
      },
    });
  }

  console.log('Reference data & directory seeded successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding reference data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
