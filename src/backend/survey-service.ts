import crypto from 'crypto';
import { db } from './db';
import { sendReferralInvitationEmail } from './survey-email';
import {
  normalizeEmail,
  normalizeInstitutionName,
  type SurveySendInvitationsInput,
  type SurveySubmissionInput,
} from './survey-validation';

export const PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG = 'pakistan-banking-expertise-map';
export const MAX_INVITATIONS_PER_CAMPAIGN = 3;
const VERIFICATION_TOKEN_TTL_HOURS = 24;

export class SurveyDomainError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'SURVEY_ERROR') {
    super(message);
    this.name = 'SurveyDomainError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function hashVerificationToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function hashIpAddress(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.NEXTAUTH_SECRET || 'ghrm-survey-ip-salt';
  return crypto.createHmac('sha256', salt).update(ip).digest('hex');
}

export async function getSurveyCampaignMetadata(campaignSlug: string) {
  const campaign = await db.surveyCampaign.findUnique({
    where: { slug: campaignSlug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      status: true,
      startsAt: true,
      endsAt: true,
    },
  });

  if (!campaign) {
    throw new SurveyDomainError('Survey campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');
  }

  const [
    rawCategories,
    campaignCategorySettings,
    rawInstitutions,
    rawExpertise,
    rawInterests,
    citiesSet,
    campaignChoiceAvailability,
  ] = await Promise.all([
    db.institutionCategory.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        shortLabel: true,
        description: true,
        displayOrder: true,
        isCommercialBank: true,
      },
    }),
    db.campaignInstitutionCategory.findMany({
      where: { campaignId: campaign.id },
      select: { categoryId: true, isEnabled: true },
    }),
    db.institution.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        shortCode: true,
        categoryId: true,
        operatingStatus: true,
        statusNote: true,
        isSelectable: true,
        isHistorical: true,
        successorInstitution: {
          select: { id: true, code: true, name: true, shortCode: true },
        },
        aliases: {
          select: { alias: true, aliasType: true },
        },
      },
    }),
    db.expertiseCategory.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        displayOrder: true,
        isOtherOption: true,
      },
    }),
    db.engagementInterest.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
      select: { id: true, slug: true, label: true, description: true, displayOrder: true },
    }),
    db.surveyChoiceSet.findUnique({
      where: { code: 'cities' },
      select: {
        choices: {
          where: { isActive: true },
          orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
          select: {
            id: true,
            code: true,
            label: true,
            aliases: true,
            displayOrder: true,
            isOtherOption: true,
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
  ]);

  const catEnabledMap = new Map(campaignCategorySettings.map((c) => [c.categoryId, c.isEnabled]));
  const disabledExpertiseIds = new Set(
    campaignChoiceAvailability
      .filter((c) => c.expertiseCategoryId && !c.isEnabled)
      .map((c) => c.expertiseCategoryId!)
  );
  const disabledInterestIds = new Set(
    campaignChoiceAvailability
      .filter((c) => c.engagementInterestId && !c.isEnabled)
      .map((c) => c.engagementInterestId!)
  );
  const disabledCityIds = new Set(
    campaignChoiceAvailability.filter((c) => c.choiceId && !c.isEnabled).map((c) => c.choiceId!)
  );

  const institutionCategories = rawCategories.filter(
    (cat) => catEnabledMap.get(cat.id) !== false
  );
  const enabledCategoryIds = new Set(institutionCategories.map((c) => c.id));

  const institutions = rawInstitutions
    .filter((inst) => {
      if (inst.isHistorical || !inst.isSelectable) return true; // Keep historical for search guidance
      if (!inst.categoryId) return true;
      return enabledCategoryIds.has(inst.categoryId);
    })
    .map((inst) => ({
      id: inst.id,
      code: inst.code,
      name: inst.name,
      shortCode: inst.shortCode,
      categoryId: inst.categoryId,
      operatingStatus: inst.operatingStatus,
      statusNote: inst.statusNote,
      isSelectable: inst.isSelectable,
      isHistorical: inst.isHistorical,
      successorInstitution: inst.successorInstitution,
      aliases: inst.aliases.map((a) => a.alias),
    }));

  const expertiseCategories = rawExpertise.filter((e) => !disabledExpertiseIds.has(e.id));
  const engagementInterests = rawInterests.filter((i) => !disabledInterestIds.has(i.id));
  const cities = (citiesSet?.choices ?? []).filter((c) => !disabledCityIds.has(c.id));

  return {
    campaign,
    institutionCategories,
    institutions,
    expertiseCategories,
    engagementInterests,
    cities,
  };
}

export async function submitSurveyResponse(
  campaignSlug: string,
  input: SurveySubmissionInput,
  ipHash: string | null = null
) {
  const normalizedEmail = normalizeEmail(input.officialEmail);

  const campaign = await db.surveyCampaign.findUnique({
    where: { slug: campaignSlug },
  });

  if (!campaign || campaign.status !== 'active') {
    throw new SurveyDomainError(
      'This survey campaign is not currently accepting submissions.',
      404,
      'CAMPAIGN_INACTIVE'
    );
  }

  const suppression = await db.emailSuppression.findUnique({
    where: { normalizedEmail },
    select: { id: true },
  });

  if (suppression) {
    throw new SurveyDomainError(
      'This email address is currently suppressed from survey communications.',
      403,
      'EMAIL_SUPPRESSED'
    );
  }

  const existingSubmission = await db.surveySubmission.findUnique({
    where: {
      campaignId_normalizedEmail: {
        campaignId: campaign.id,
        normalizedEmail,
      },
    },
    select: { id: true, status: true },
  });

  if (existingSubmission?.status === 'verified') {
    throw new SurveyDomainError(
      'A verified submission already exists for this email address in this campaign.',
      409,
      'DUPLICATE_VERIFIED_SUBMISSION'
    );
  }

  // Resolve and validate Bank / Financial Institution
  let institution = input.institutionId
    ? await db.institution.findUnique({
        where: { id: input.institutionId },
        include: {
          successorInstitution: { select: { id: true, name: true } },
        },
      })
    : null;

  if (!institution && input.institutionName) {
    const normalizedInstName = normalizeInstitutionName(input.institutionName);
    institution = await db.institution.findFirst({
      where: {
        OR: [
          { normalizedName: normalizedInstName },
          { aliases: { some: { normalizedAlias: normalizedInstName } } },
        ],
      },
      include: {
        successorInstitution: { select: { id: true, name: true } },
      },
    });
  }

  if (!institution || !institution.isActive) {
    throw new SurveyDomainError(
      'The selected Bank / Financial Institution is unavailable or no longer active for this survey. Please choose another institution or select "Other — please specify".',
      400,
      'INVALID_INSTITUTION'
    );
  }

  if (institution.isHistorical || !institution.isSelectable) {
    const successorMsg = institution.successorInstitution
      ? ` Please select ${institution.successorInstitution.name} or "Other — please specify" instead.`
      : ' Please select an active institution or "Other — please specify".';
    throw new SurveyDomainError(
      `${institution.name} is a historical or non-active institution.${successorMsg}`,
      400,
      'HISTORICAL_INSTITUTION'
    );
  }

  if (institution.categoryId) {
    const catSetting = await db.campaignInstitutionCategory.findUnique({
      where: {
        campaignId_categoryId: {
          campaignId: campaign.id,
          categoryId: institution.categoryId,
        },
      },
      select: { isEnabled: true },
    });
    if (catSetting && !catSetting.isEnabled) {
      throw new SurveyDomainError(
        'The selected institution category is not enabled for this campaign.',
        400,
        'INSTITUTION_CATEGORY_DISABLED'
      );
    }
  }

  const isOtherInstitution =
    institution.operatingStatus === 'other_placeholder' || institution.code === 'other_institution';
  const otherInstitutionText = input.otherInstitutionText?.trim() || null;
  if (isOtherInstitution && (!otherInstitutionText || otherInstitutionText.length < 2)) {
    throw new SurveyDomainError(
      'Please specify your Bank / Financial Institution when selecting "Other — please specify".',
      400,
      'OTHER_INSTITUTION_REQUIRED'
    );
  }

  // Validate expertise category slugs & campaign availability
  const requestedCategorySlugs = input.rankedExpertise.map((item) => item.categorySlug);
  const categories = await db.expertiseCategory.findMany({
    where: { slug: { in: requestedCategorySlugs }, isActive: true },
    select: { id: true, slug: true, name: true, isOtherOption: true },
  });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const disabledExpertise = await db.campaignChoiceAvailability.findMany({
    where: {
      campaignId: campaign.id,
      expertiseCategoryId: { in: categories.map((c) => c.id) },
      isEnabled: false,
    },
    select: { expertiseCategoryId: true },
  });
  const disabledExpertiseSet = new Set(disabledExpertise.map((d) => d.expertiseCategoryId));

  let hasOtherExpertise = false;
  for (const item of input.rankedExpertise) {
    const cat = categoryBySlug.get(item.categorySlug);
    if (!cat || disabledExpertiseSet.has(cat.id)) {
      throw new SurveyDomainError(
        `One or more selected expertise categories are invalid or inactive: ${item.categorySlug}`,
        400,
        'INVALID_CATEGORY'
      );
    }
    if (cat.isOtherOption) {
      hasOtherExpertise = true;
    }
  }

  const otherExpertiseText = input.otherExpertiseText?.trim() || null;
  if (hasOtherExpertise && (!otherExpertiseText || otherExpertiseText.length < 2)) {
    throw new SurveyDomainError(
      'Please specify your area of expertise when selecting "Other — please specify".',
      400,
      'OTHER_EXPERTISE_REQUIRED'
    );
  }

  // Validate engagement interest slugs & campaign availability
  const uniqueInterestSlugs = Array.from(new Set(input.engagementInterestSlugs || []));
  const interests =
    uniqueInterestSlugs.length > 0
      ? await db.engagementInterest.findMany({
          where: { slug: { in: uniqueInterestSlugs }, isActive: true },
          select: { id: true, slug: true, label: true },
        })
      : [];

  if (interests.length !== uniqueInterestSlugs.length) {
    throw new SurveyDomainError(
      'One or more selected engagement interests are invalid or inactive.',
      400,
      'INVALID_INTEREST'
    );
  }

  if (interests.length > 0) {
    const disabledInterests = await db.campaignChoiceAvailability.findMany({
      where: {
        campaignId: campaign.id,
        engagementInterestId: { in: interests.map((i) => i.id) },
        isEnabled: false,
      },
      select: { engagementInterestId: true },
    });
    if (disabledInterests.length > 0) {
      throw new SurveyDomainError(
        'One or more selected engagement interests are not enabled for this campaign.',
        400,
        'INVALID_INTEREST'
      );
    }
  }

  // Resolve and validate City choice if provided
  let cityChoice: { id: string; label: string; isOtherOption: boolean; isActive: boolean } | null = null;
  if (input.cityId) {
    cityChoice = await db.surveyChoice.findUnique({
      where: { id: input.cityId },
      select: { id: true, label: true, isOtherOption: true, isActive: true },
    });
    if (!cityChoice || !cityChoice.isActive) {
      throw new SurveyDomainError(
        'The selected city is invalid or no longer active.',
        400,
        'INVALID_CITY'
      );
    }
    const disabledCity = await db.campaignChoiceAvailability.findUnique({
      where: {
        campaignId_choiceId: {
          campaignId: campaign.id,
          choiceId: cityChoice.id,
        },
      },
      select: { isEnabled: true },
    });
    if (disabledCity && !disabledCity.isEnabled) {
      throw new SurveyDomainError(
        'The selected city is not enabled for this campaign.',
        400,
        'INVALID_CITY'
      );
    }
  } else if (input.city?.trim()) {
    const cityByLabel = await db.surveyChoice.findFirst({
      where: {
        choiceSet: { code: 'cities' },
        label: { equals: input.city.trim(), mode: 'insensitive' },
        isActive: true,
      },
      select: { id: true, label: true, isOtherOption: true, isActive: true },
    });
    if (cityByLabel) {
      cityChoice = cityByLabel;
    }
  }

  const otherCityText = input.otherCityText?.trim() || null;
  if (cityChoice?.isOtherOption && (!otherCityText || otherCityText.length < 2)) {
    throw new SurveyDomainError(
      'Please specify your city when selecting "Other — please specify".',
      400,
      'OTHER_CITY_REQUIRED'
    );
  }

  // Resolve optional referral link (prevent self-referrals)
  let referralLinkId: string | null = null;
  let referralAttribution: string | null = null;
  if (input.referralCode) {
    const referral = await db.referralLink.findFirst({
      where: {
        code: input.referralCode.trim(),
        campaignId: campaign.id,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        createdBy: {
          select: { normalizedEmail: true },
        },
      },
    });
    if (referral && referral.createdBy?.normalizedEmail !== normalizedEmail) {
      referralLinkId = referral.id;
      referralAttribution = referral.code;
    }
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashVerificationToken(rawToken);
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  const result = await db.$transaction(async (tx) => {
    const existingParticipant = await tx.surveyParticipant.findUnique({
      where: { normalizedEmail },
      select: { id: true },
    });

    const resolvedInstitutionRaw = isOtherInstitution
      ? otherInstitutionText!
      : input.institutionName?.trim() || institution.name;

    const resolvedCityLabel = cityChoice
      ? cityChoice.isOtherOption
        ? otherCityText!
        : cityChoice.label
      : input.city?.trim() || null;

    const submissionData = {
      campaignId: campaign.id,
      participantId: existingParticipant?.id ?? null,
      institutionId: institution.id,
      institutionNameRaw: resolvedInstitutionRaw,
      institutionNameSnapshot: institution.name,
      otherInstitutionText,
      preferredName: input.preferredName.trim(),
      designation: input.designation.trim(),
      organizationalGrade: input.organizationalGrade?.trim() || null,
      officialEmail: input.officialEmail.trim(),
      normalizedEmail,
      city: resolvedCityLabel,
      cityId: cityChoice?.id ?? null,
      cityNameSnapshot: cityChoice?.label ?? (input.city?.trim() || null),
      totalBankingExperienceYears: input.totalBankingExperienceYears,
      experienceOverview: input.experienceOverview?.trim() || null,
      otherExpertiseText,
      status: 'pending_verification',
      referralAttribution,
      referralLinkId,
      submittedAt: new Date(),
    };

    const submission = existingSubmission
      ? await tx.surveySubmission.update({
          where: { id: existingSubmission.id },
          data: submissionData,
        })
      : await tx.surveySubmission.create({
          data: submissionData,
        });

    // Replace ranked expertise selections with label snapshots
    await tx.surveyRankedExpertise.deleteMany({
      where: { submissionId: submission.id },
    });
    await tx.surveyRankedExpertise.createMany({
      data: input.rankedExpertise.map((item) => {
        const cat = categoryBySlug.get(item.categorySlug)!;
        return {
          submissionId: submission.id,
          categoryId: cat.id,
          categoryNameSnapshot: cat.name,
          rank: item.rank,
        };
      }),
    });

    // Replace engagement interests with label snapshots
    await tx.surveySubmissionInterest.deleteMany({
      where: { submissionId: submission.id },
    });
    if (interests.length > 0) {
      await tx.surveySubmissionInterest.createMany({
        data: interests.map((interest) => ({
          submissionId: submission.id,
          interestId: interest.id,
          interestLabelSnapshot: interest.label,
        })),
      });
    }

    // Queue "Other — please specify" proposals for admin review (never auto-publish to dropdown)
    await tx.surveyOtherProposal.deleteMany({
      where: { submissionId: submission.id, status: 'pending' },
    });
    const proposalsToCreate: Array<{
      submissionId: string;
      proposalType: string;
      submittedText: string;
    }> = [];
    if (isOtherInstitution && otherInstitutionText) {
      proposalsToCreate.push({
        submissionId: submission.id,
        proposalType: 'institution',
        submittedText: otherInstitutionText,
      });
    }
    if (hasOtherExpertise && otherExpertiseText) {
      proposalsToCreate.push({
        submissionId: submission.id,
        proposalType: 'expertise',
        submittedText: otherExpertiseText,
      });
    }
    if (cityChoice?.isOtherOption && otherCityText) {
      proposalsToCreate.push({
        submissionId: submission.id,
        proposalType: 'city',
        submittedText: otherCityText,
      });
    }
    if (proposalsToCreate.length > 0) {
      await tx.surveyOtherProposal.createMany({
        data: proposalsToCreate,
      });
    }

    // Record separate participation and communications consents
    const consentEntries = [
      { consentType: 'participation', granted: input.participationConsent },
      { consentType: 'communications', granted: input.communicationsConsent },
    ];
    for (const consent of consentEntries) {
      await tx.consentRecord.upsert({
        where: {
          submissionId_consentType: {
            submissionId: submission.id,
            consentType: consent.consentType,
          },
        },
        update: {
          granted: consent.granted,
          capturedAt: new Date(),
          ipHash,
        },
        create: {
          submissionId: submission.id,
          participantId: existingParticipant?.id ?? null,
          consentType: consent.consentType,
          granted: consent.granted,
          ipHash,
        },
      });
    }

    // Store only the SHA-256 hash of the verification token
    await tx.surveyVerificationToken.create({
      data: {
        submissionId: submission.id,
        normalizedEmail,
        tokenHash,
        expiresAt,
      },
    });

    return submission;
  });

  return {
    submissionId: result.id,
    status: result.status,
    verificationExpiresAt: expiresAt.toISOString(),
    // Note: rawToken is returned only to the server caller for email delivery, never persisted.
    rawVerificationToken: rawToken,
  };
}

export async function verifySurveySubmissionToken(rawToken: string) {
  const tokenHash = hashVerificationToken(rawToken);

  const tokenRecord = await db.surveyVerificationToken.findUnique({
    where: { tokenHash },
    include: { submission: true },
  });

  if (!tokenRecord) {
    throw new SurveyDomainError('Verification token is invalid.', 400, 'INVALID_TOKEN');
  }
  if (tokenRecord.consumedAt) {
    throw new SurveyDomainError('Verification token has already been used.', 409, 'TOKEN_CONSUMED');
  }
  if (tokenRecord.expiresAt < new Date()) {
    throw new SurveyDomainError('Verification token has expired.', 410, 'TOKEN_EXPIRED');
  }

  const now = new Date();

  const updated = await db.$transaction(async (tx) => {
    await tx.surveyVerificationToken.update({
      where: { id: tokenRecord.id },
      data: { consumedAt: now },
    });

    const sub = tokenRecord.submission;
    const participant = await tx.surveyParticipant.upsert({
      where: { normalizedEmail: sub.normalizedEmail },
      update: {
        preferredName: sub.preferredName,
        officialEmail: sub.officialEmail,
        institutionId: sub.institutionId,
        designation: sub.designation,
        organizationalGrade: sub.organizationalGrade,
        city: sub.city,
        cityId: sub.cityId,
        totalBankingExperienceYears: sub.totalBankingExperienceYears,
        experienceOverview: sub.experienceOverview,
        emailVerified: true,
        emailVerifiedAt: now,
      },
      create: {
        preferredName: sub.preferredName,
        officialEmail: sub.officialEmail,
        normalizedEmail: sub.normalizedEmail,
        institutionId: sub.institutionId,
        designation: sub.designation,
        organizationalGrade: sub.organizationalGrade,
        city: sub.city,
        cityId: sub.cityId,
        totalBankingExperienceYears: sub.totalBankingExperienceYears,
        experienceOverview: sub.experienceOverview,
        emailVerified: true,
        emailVerifiedAt: now,
      },
    });

    const verifiedSubmission = await tx.surveySubmission.update({
      where: { id: sub.id },
      data: {
        participantId: participant.id,
        status: 'verified',
        verifiedAt: now,
      },
    });

    await tx.consentRecord.updateMany({
      where: { submissionId: sub.id },
      data: { participantId: participant.id },
    });

    await tx.referralInvitation.updateMany({
      where: {
        campaignId: sub.campaignId,
        normalizedEmail: sub.normalizedEmail,
        status: 'sent',
      },
      data: {
        status: 'accepted',
        acceptedAt: now,
      },
    });

    // Ensure a unique, persistent opaque referral link exists for this verified participant & campaign
    let referralLink = await tx.referralLink.findFirst({
      where: {
        campaignId: sub.campaignId,
        createdByParticipantId: participant.id,
      },
    });

    if (!referralLink) {
      referralLink = await tx.referralLink.create({
        data: {
          code: crypto.randomBytes(18).toString('base64url'),
          campaignId: sub.campaignId,
          createdByParticipantId: participant.id,
          isActive: true,
        },
      });
    }

    const invitations = await tx.referralInvitation.findMany({
      where: {
        referralLinkId: referralLink.id,
      },
      orderBy: { invitedAt: 'desc' },
      select: {
        id: true,
        invitedPreferredName: true,
        invitedEmail: true,
        status: true,
        invitedAt: true,
      },
    });

    return { participant, verifiedSubmission, referralLink, invitations };
  });

  const invitationsSentCount = updated.invitations.length;

  return {
    submissionId: updated.verifiedSubmission.id,
    participantId: updated.participant.id,
    preferredName: updated.participant.preferredName,
    status: updated.verifiedSubmission.status,
    verifiedAt: updated.verifiedSubmission.verifiedAt?.toISOString() ?? null,
    referralCode: updated.referralLink.code,
    maxInvitations: MAX_INVITATIONS_PER_CAMPAIGN,
    invitationsSentCount,
    remainingInvitations: Math.max(0, MAX_INVITATIONS_PER_CAMPAIGN - invitationsSentCount),
    invitations: updated.invitations.map((inv) => ({
      ...inv,
      invitedAt: inv.invitedAt.toISOString(),
    })),
  };
}

/**
 * Validates whether an opaque referral token is active for a campaign.
 * Never exposes the referrer's email, name, or profile.
 */
export async function validateReferralCode(campaignSlug: string, code: string) {
  const trimmed = code.trim();
  if (!trimmed) return { valid: false };

  const campaign = await db.surveyCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true, status: true },
  });

  if (!campaign || campaign.status !== 'active') {
    return { valid: false };
  }

  const link = await db.referralLink.findFirst({
    where: {
      code: trimmed,
      campaignId: campaign.id,
      isActive: true,
    },
    select: { id: true },
  });

  return { valid: Boolean(link) };
}

export async function getParticipantReferralState(participantId: string, campaignSlug: string) {
  const campaign = await db.surveyCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true, status: true },
  });
  if (!campaign) {
    throw new SurveyDomainError('Survey campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');
  }

  const participant = await db.surveyParticipant.findUnique({
    where: { id: participantId },
    select: { id: true, preferredName: true, emailVerified: true },
  });
  if (!participant || !participant.emailVerified) {
    throw new SurveyDomainError('Verified participant session not found.', 401, 'UNAUTHORIZED');
  }

  let referralLink = await db.referralLink.findFirst({
    where: {
      campaignId: campaign.id,
      createdByParticipantId: participant.id,
      isActive: true,
    },
  });

  if (!referralLink) {
    referralLink = await db.referralLink.create({
      data: {
        code: crypto.randomBytes(18).toString('base64url'),
        campaignId: campaign.id,
        createdByParticipantId: participant.id,
        isActive: true,
      },
    });
  }

  const invitations = await db.referralInvitation.findMany({
    where: { referralLinkId: referralLink.id },
    orderBy: { invitedAt: 'desc' },
    select: {
      id: true,
      invitedPreferredName: true,
      invitedEmail: true,
      status: true,
      invitedAt: true,
    },
  });

  return {
    preferredName: participant.preferredName,
    referralCode: referralLink.code,
    maxInvitations: MAX_INVITATIONS_PER_CAMPAIGN,
    invitationsSentCount: invitations.length,
    remainingInvitations: Math.max(0, MAX_INVITATIONS_PER_CAMPAIGN - invitations.length),
    invitations: invitations.map((inv) => ({
      ...inv,
      invitedAt: inv.invitedAt.toISOString(),
    })),
  };
}

export async function sendParticipantInvitations(
  participantId: string,
  campaignSlug: string,
  input: SurveySendInvitationsInput,
  siteOrigin: string
) {
  const campaign = await db.surveyCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true, slug: true, status: true },
  });
  if (!campaign || campaign.status !== 'active') {
    throw new SurveyDomainError('Survey campaign is not active.', 404, 'CAMPAIGN_INACTIVE');
  }

  const participant = await db.surveyParticipant.findUnique({
    where: { id: participantId },
    select: { id: true, preferredName: true, normalizedEmail: true, emailVerified: true },
  });
  if (!participant || !participant.emailVerified) {
    throw new SurveyDomainError('Only verified participants can send invitations.', 401, 'UNAUTHORIZED');
  }

  // Ensure persistent referral link exists
  let referralLink = await db.referralLink.findFirst({
    where: {
      campaignId: campaign.id,
      createdByParticipantId: participant.id,
      isActive: true,
    },
  });
  if (!referralLink) {
    referralLink = await db.referralLink.create({
      data: {
        code: crypto.randomBytes(18).toString('base64url'),
        campaignId: campaign.id,
        createdByParticipantId: participant.id,
        isActive: true,
      },
    });
  }

  // Server-side enforcement of max 3 invitations per participant per campaign across all attempts
  const existingInvitations = await db.referralInvitation.findMany({
    where: { referralLinkId: referralLink.id },
    select: { id: true, normalizedEmail: true },
  });

  const remaining = MAX_INVITATIONS_PER_CAMPAIGN - existingInvitations.length;
  if (remaining <= 0) {
    throw new SurveyDomainError(
      `You have reached the maximum limit of ${MAX_INVITATIONS_PER_CAMPAIGN} invitations for this campaign.`,
      400,
      'INVITATION_LIMIT_REACHED'
    );
  }
  if (input.colleagues.length > remaining) {
    throw new SurveyDomainError(
      `You can only send ${remaining} more invitation(s) for this campaign.`,
      400,
      'INVITATION_LIMIT_EXCEEDED'
    );
  }

  // Validate against self-invites, already-verified participants, suppressions, and existing campaign invites
  const normalizedEmails = input.colleagues.map((c) => normalizeEmail(c.officialEmail));
  if (normalizedEmails.includes(participant.normalizedEmail)) {
    throw new SurveyDomainError(
      'You cannot invite your own email address.',
      400,
      'SELF_INVITE_NOT_ALLOWED'
    );
  }

  const [suppressions, existingCampaignInvites, verifiedSubmissions] = await Promise.all([
    db.emailSuppression.findMany({
      where: { normalizedEmail: { in: normalizedEmails } },
      select: { normalizedEmail: true },
    }),
    db.referralInvitation.findMany({
      where: { campaignId: campaign.id, normalizedEmail: { in: normalizedEmails } },
      select: { normalizedEmail: true },
    }),
    db.surveySubmission.findMany({
      where: { campaignId: campaign.id, normalizedEmail: { in: normalizedEmails }, status: 'verified' },
      select: { normalizedEmail: true },
    }),
  ]);

  const suppressedSet = new Set(suppressions.map((s) => s.normalizedEmail));
  const alreadyInvitedSet = new Set(existingCampaignInvites.map((i) => i.normalizedEmail));
  const alreadyVerifiedSet = new Set(verifiedSubmissions.map((s) => s.normalizedEmail));

  for (const colleague of input.colleagues) {
    const norm = normalizeEmail(colleague.officialEmail);
    if (suppressedSet.has(norm)) {
      throw new SurveyDomainError(
        `${colleague.officialEmail} has opted out of receiving invitations.`,
        400,
        'EMAIL_SUPPRESSED'
      );
    }
    if (alreadyVerifiedSet.has(norm)) {
      throw new SurveyDomainError(
        `${colleague.officialEmail} has already completed this survey.`,
        409,
        'ALREADY_PARTICIPATED'
      );
    }
    if (alreadyInvitedSet.has(norm)) {
      throw new SurveyDomainError(
        `${colleague.officialEmail} has already been invited to this campaign.`,
        409,
        'ALREADY_INVITED'
      );
    }
  }

  const referralUrl = `${siteOrigin}/surveys/${campaign.slug}?ref=${encodeURIComponent(referralLink.code)}`;
  const results: Array<{
    id: string;
    invitedPreferredName: string | null;
    invitedEmail: string;
    status: string;
    invitedAt: string;
    deliveryMessage?: string;
  }> = [];

  for (const colleague of input.colleagues) {
    const norm = normalizeEmail(colleague.officialEmail);
    const created = await db.referralInvitation.create({
      data: {
        referralLinkId: referralLink.id,
        campaignId: campaign.id,
        invitedPreferredName: colleague.preferredName?.trim() || null,
        invitedEmail: colleague.officialEmail.trim(),
        normalizedEmail: norm,
        status: 'sent',
      },
    });

    const emailResult = await sendReferralInvitationEmail({
      toEmail: created.invitedEmail,
      colleaguePreferredName: created.invitedPreferredName,
      referrerPreferredName: participant.preferredName,
      referralUrl,
    });

    let finalStatus = created.status;
    if (!emailResult.success) {
      finalStatus = 'failed';
      await db.referralInvitation.update({
        where: { id: created.id },
        data: { status: 'failed' },
      });
    }

    results.push({
      id: created.id,
      invitedPreferredName: created.invitedPreferredName,
      invitedEmail: created.invitedEmail,
      status: finalStatus,
      invitedAt: created.invitedAt.toISOString(),
      ...(emailResult.success ? {} : { deliveryMessage: emailResult.message }),
    });
  }

  const allInvitations = await db.referralInvitation.findMany({
    where: { referralLinkId: referralLink.id },
    orderBy: { invitedAt: 'desc' },
    select: {
      id: true,
      invitedPreferredName: true,
      invitedEmail: true,
      status: true,
      invitedAt: true,
    },
  });

  return {
    referralCode: referralLink.code,
    maxInvitations: MAX_INVITATIONS_PER_CAMPAIGN,
    invitationsSentCount: allInvitations.length,
    remainingInvitations: Math.max(0, MAX_INVITATIONS_PER_CAMPAIGN - allInvitations.length),
    sentResults: results,
    invitations: allInvitations.map((inv) => ({
      ...inv,
      invitedAt: inv.invitedAt.toISOString(),
    })),
  };
}

export async function listSurveySubmissionsForAdmin(
  campaignSlug: string,
  limit = 50,
  offset = 0
) {
  const campaign = await db.surveyCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true, slug: true, title: true },
  });

  if (!campaign) {
    throw new SurveyDomainError('Survey campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');
  }

  const [total, submissions] = await Promise.all([
    db.surveySubmission.count({ where: { campaignId: campaign.id } }),
    db.surveySubmission.findMany({
      where: { campaignId: campaign.id },
      orderBy: { submittedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      skip: Math.max(offset, 0),
      include: {
        institution: { select: { id: true, name: true, shortCode: true } },
        rankedExpertise: {
          orderBy: { rank: 'asc' },
          include: { category: { select: { slug: true, name: true } } },
        },
        interests: {
          include: { interest: { select: { slug: true, label: true } } },
        },
        consentRecords: {
          select: { consentType: true, granted: true, policyVersion: true, capturedAt: true },
        },
      },
    }),
  ]);

  return { campaign, total, submissions };
}
