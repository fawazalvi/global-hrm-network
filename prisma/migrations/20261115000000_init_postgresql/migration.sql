-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "profilePhotoURL" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "accountStatus" TEXT NOT NULL DEFAULT 'pending',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT,
    "summary" TEXT,
    "yearsOfExperience" INTEGER NOT NULL DEFAULT 0,
    "industries" TEXT,
    "skills" TEXT,
    "certifications" TEXT,
    "employmentHistory" TEXT,
    "education" TEXT,
    "country" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "profileScore" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "proofURL" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "paymentProvider" TEXT NOT NULL DEFAULT 'Stripe',

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "currentRole" TEXT NOT NULL,
    "yearsOfExperience" INTEGER NOT NULL,
    "linkedinUrl" TEXT NOT NULL,
    "expertise" TEXT,
    "interest" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileScore" INTEGER,
    "relevanceScore" INTEGER,
    "profileScoreFeedback" TEXT,
    "relevanceScoreFeedback" TEXT,
    "assessments" TEXT,
    "approvedUserId" TEXT,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HRExpertise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "HRExpertise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "logoUrl" TEXT NOT NULL,

    CONSTRAINT "GlobalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "shortCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Pakistan',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyCampaign" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpertiseCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpertiseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementInterest" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyParticipant" (
    "id" TEXT NOT NULL,
    "preferredName" TEXT NOT NULL,
    "officialEmail" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "organizationalGrade" TEXT,
    "city" TEXT,
    "totalBankingExperienceYears" DECIMAL(4,1) NOT NULL,
    "experienceOverview" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveySubmission" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "participantId" TEXT,
    "institutionId" TEXT NOT NULL,
    "institutionNameRaw" TEXT NOT NULL,
    "preferredName" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "organizationalGrade" TEXT,
    "officialEmail" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "city" TEXT,
    "totalBankingExperienceYears" DECIMAL(4,1) NOT NULL,
    "experienceOverview" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_verification',
    "referralAttribution" TEXT,
    "referralLinkId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyRankedExpertise" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "SurveyRankedExpertise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveySubmissionInterest" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "interestId" TEXT NOT NULL,

    CONSTRAINT "SurveySubmissionInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "participantId" TEXT,
    "consentType" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "policyVersion" TEXT NOT NULL DEFAULT 'v1.0',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyVerificationToken" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralLink" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdByParticipantId" TEXT,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralInvitation" (
    "id" TEXT NOT NULL,
    "referralLinkId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "ReferralInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSuppression" (
    "id" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT,
    "suppressedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_email_key" ON "Application"("email");

-- CreateIndex
CREATE UNIQUE INDEX "HRExpertise_name_key" ON "HRExpertise"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_normalizedName_key" ON "Institution"("normalizedName");

-- CreateIndex
CREATE INDEX "Institution_isActive_idx" ON "Institution"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyCampaign_slug_key" ON "SurveyCampaign"("slug");

-- CreateIndex
CREATE INDEX "SurveyCampaign_status_idx" ON "SurveyCampaign"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ExpertiseCategory_slug_key" ON "ExpertiseCategory"("slug");

-- CreateIndex
CREATE INDEX "ExpertiseCategory_isActive_displayOrder_idx" ON "ExpertiseCategory"("isActive", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "EngagementInterest_slug_key" ON "EngagementInterest"("slug");

-- CreateIndex
CREATE INDEX "EngagementInterest_isActive_displayOrder_idx" ON "EngagementInterest"("isActive", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyParticipant_normalizedEmail_key" ON "SurveyParticipant"("normalizedEmail");

-- CreateIndex
CREATE INDEX "SurveyParticipant_institutionId_idx" ON "SurveyParticipant"("institutionId");

-- CreateIndex
CREATE INDEX "SurveyParticipant_emailVerified_idx" ON "SurveyParticipant"("emailVerified");

-- CreateIndex
CREATE INDEX "SurveySubmission_campaignId_status_idx" ON "SurveySubmission"("campaignId", "status");

-- CreateIndex
CREATE INDEX "SurveySubmission_participantId_idx" ON "SurveySubmission"("participantId");

-- CreateIndex
CREATE INDEX "SurveySubmission_normalizedEmail_idx" ON "SurveySubmission"("normalizedEmail");

-- CreateIndex
CREATE UNIQUE INDEX "SurveySubmission_campaignId_normalizedEmail_key" ON "SurveySubmission"("campaignId", "normalizedEmail");

-- CreateIndex
CREATE INDEX "SurveyRankedExpertise_categoryId_idx" ON "SurveyRankedExpertise"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyRankedExpertise_submissionId_rank_key" ON "SurveyRankedExpertise"("submissionId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyRankedExpertise_submissionId_categoryId_key" ON "SurveyRankedExpertise"("submissionId", "categoryId");

-- CreateIndex
CREATE INDEX "SurveySubmissionInterest_interestId_idx" ON "SurveySubmissionInterest"("interestId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveySubmissionInterest_submissionId_interestId_key" ON "SurveySubmissionInterest"("submissionId", "interestId");

-- CreateIndex
CREATE INDEX "ConsentRecord_participantId_consentType_idx" ON "ConsentRecord"("participantId", "consentType");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentRecord_submissionId_consentType_key" ON "ConsentRecord"("submissionId", "consentType");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyVerificationToken_tokenHash_key" ON "SurveyVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "SurveyVerificationToken_submissionId_idx" ON "SurveyVerificationToken"("submissionId");

-- CreateIndex
CREATE INDEX "SurveyVerificationToken_expiresAt_idx" ON "SurveyVerificationToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralLink_code_key" ON "ReferralLink"("code");

-- CreateIndex
CREATE INDEX "ReferralLink_campaignId_isActive_idx" ON "ReferralLink"("campaignId", "isActive");

-- CreateIndex
CREATE INDEX "ReferralInvitation_referralLinkId_idx" ON "ReferralInvitation"("referralLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralInvitation_campaignId_normalizedEmail_key" ON "ReferralInvitation"("campaignId", "normalizedEmail");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSuppression_normalizedEmail_key" ON "EmailSuppression"("normalizedEmail");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SurveyParticipant" ADD CONSTRAINT "SurveyParticipant_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySubmission" ADD CONSTRAINT "SurveySubmission_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SurveyCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySubmission" ADD CONSTRAINT "SurveySubmission_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SurveyParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySubmission" ADD CONSTRAINT "SurveySubmission_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySubmission" ADD CONSTRAINT "SurveySubmission_referralLinkId_fkey" FOREIGN KEY ("referralLinkId") REFERENCES "ReferralLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyRankedExpertise" ADD CONSTRAINT "SurveyRankedExpertise_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "SurveySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyRankedExpertise" ADD CONSTRAINT "SurveyRankedExpertise_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpertiseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySubmissionInterest" ADD CONSTRAINT "SurveySubmissionInterest_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "SurveySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySubmissionInterest" ADD CONSTRAINT "SurveySubmissionInterest_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "EngagementInterest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "SurveySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SurveyParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyVerificationToken" ADD CONSTRAINT "SurveyVerificationToken_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "SurveySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralLink" ADD CONSTRAINT "ReferralLink_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SurveyCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralLink" ADD CONSTRAINT "ReferralLink_createdByParticipantId_fkey" FOREIGN KEY ("createdByParticipantId") REFERENCES "SurveyParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralInvitation" ADD CONSTRAINT "ReferralInvitation_referralLinkId_fkey" FOREIGN KEY ("referralLinkId") REFERENCES "ReferralLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralInvitation" ADD CONSTRAINT "ReferralInvitation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SurveyCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
