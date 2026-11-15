import { z } from 'zod';

/**
 * Consistent email normalization without provider-specific transformations
 * (such as stripping dots from Gmail local-parts).
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeInstitutionName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export const RankedExpertiseItemSchema = z.object({
  categorySlug: z.string().trim().min(1, 'Expertise category is required').max(100),
  rank: z.number().int().min(1).max(3),
});

export const SurveySubmissionInputSchema = z
  .object({
    preferredName: z
      .string()
      .trim()
      .min(2, 'Preferred name must be at least 2 characters')
      .max(120, 'Preferred name must be at most 120 characters'),
    institutionId: z
      .string()
      .trim()
      .min(1, 'Bank / Financial Institution is required')
      .max(100)
      .optional()
      .nullable(),
    institutionName: z
      .string()
      .trim()
      .max(160, 'Institution name must be at most 160 characters')
      .optional()
      .nullable(),
    otherInstitutionText: z
      .string()
      .trim()
      .max(240, 'Please specify your institution in 240 characters or fewer')
      .optional()
      .nullable(),
    designation: z
      .string()
      .trim()
      .min(2, 'Designation is required')
      .max(140, 'Designation must be at most 140 characters'),
    organizationalGrade: z
      .string()
      .trim()
      .max(60, 'Organizational grade must be at most 60 characters')
      .optional()
      .nullable(),
    officialEmail: z
      .string()
      .trim()
      .email('A valid official email address is required')
      .max(254, 'Email address is too long'),
    cityId: z
      .string()
      .trim()
      .max(100)
      .optional()
      .nullable(),
    city: z
      .string()
      .trim()
      .max(80, 'City must be at most 80 characters')
      .optional()
      .nullable(),
    otherCityText: z
      .string()
      .trim()
      .max(120, 'Please specify your city in 120 characters or fewer')
      .optional()
      .nullable(),
    rankedExpertise: z
      .array(RankedExpertiseItemSchema)
      .min(1, 'Select at least 1 expertise category')
      .max(3, 'Select up to 3 ranked expertise categories'),
    otherExpertiseText: z
      .string()
      .trim()
      .max(240, 'Please specify your expertise in 240 characters or fewer')
      .optional()
      .nullable(),
    totalBankingExperienceYears: z
      .number()
      .min(0, 'Total banking experience cannot be negative')
      .max(70, 'Total banking experience cannot exceed 70 years'),
    experienceOverview: z
      .string()
      .trim()
      .max(2000, 'Experience overview must be at most 2000 characters')
      .optional()
      .nullable(),
    engagementInterestSlugs: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
    participationConsent: z.boolean().refine((val) => val === true, {
      message: 'Participation consent is required to submit the survey',
    }),
    communicationsConsent: z.boolean(),
    referralCode: z.string().trim().max(64).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const ranks = data.rankedExpertise.map((item) => item.rank);
    const slugs = data.rankedExpertise.map((item) => item.categorySlug);

    if (new Set(ranks).size !== ranks.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ranked expertise selections must have unique ranks (1, 2, 3)',
        path: ['rankedExpertise'],
      });
    }

    if (new Set(slugs).size !== slugs.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each ranked expertise category can only be selected once',
        path: ['rankedExpertise'],
      });
    }

    if (!data.institutionId && (!data.institutionName || data.institutionName.trim().length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bank / Financial Institution is required',
        path: ['institutionId'],
      });
    }
  });

export type SurveySubmissionInput = z.infer<typeof SurveySubmissionInputSchema>;

export const SurveyVerifyTokenSchema = z.object({
  token: z.string().trim().min(16, 'Invalid verification token').max(256),
});

export const ReferralColleagueInviteSchema = z.object({
  preferredName: z
    .string()
    .trim()
    .max(120, 'Preferred name must be at most 120 characters')
    .optional()
    .nullable(),
  officialEmail: z
    .string()
    .trim()
    .email('Please enter a valid official email address')
    .max(254, 'Email address is too long'),
});

export const SurveySendInvitationsSchema = z
  .object({
    permissionConfirmed: z.boolean().refine((val) => val === true, {
      message:
        'You must confirm that you have permission to share these email addresses for this invitation.',
    }),
    colleagues: z
      .array(ReferralColleagueInviteSchema)
      .min(1, 'Please add at least one colleague to invite')
      .max(3, 'You can invite up to 3 colleagues per campaign'),
  })
  .superRefine((data, ctx) => {
    const normalized = data.colleagues.map((c) => normalizeEmail(c.officialEmail));
    if (new Set(normalized).size !== normalized.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate colleague email addresses are not allowed.',
        path: ['colleagues'],
      });
    }
  });

export type SurveySendInvitationsInput = z.infer<typeof SurveySendInvitationsSchema>;
