-- CreateTable
CREATE TABLE "InstitutionCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortLabel" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isCommercialBank" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignInstitutionCategory" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CampaignInstitutionCategory_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Institution
ALTER TABLE "Institution" ADD COLUMN "code" TEXT,
ADD COLUMN "categoryId" TEXT,
ADD COLUMN "operatingStatus" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN "statusNote" TEXT,
ADD COLUMN "isSelectable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "isHistorical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "successorInstitutionId" TEXT,
ADD COLUMN "sourceUrl" TEXT,
ADD COLUMN "lastVerifiedAt" TIMESTAMP(3),
ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "InstitutionAlias" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "aliasType" TEXT NOT NULL DEFAULT 'abbreviation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstitutionAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionEmailDomain" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstitutionEmailDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyChoiceSet" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyChoiceSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyChoice" (
    "id" TEXT NOT NULL,
    "choiceSetId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "aliases" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isOtherOption" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignChoiceAvailability" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "choiceId" TEXT,
    "expertiseCategoryId" TEXT,
    "engagementInterestId" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CampaignChoiceAvailability_pkey" PRIMARY KEY ("id")
);

-- AlterTable: ExpertiseCategory & EngagementInterest
ALTER TABLE "ExpertiseCategory" ADD COLUMN "isOtherOption" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "EngagementInterest" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: SurveyParticipant, SurveySubmission, SurveyRankedExpertise, SurveySubmissionInterest
ALTER TABLE "SurveyParticipant" ADD COLUMN "cityId" TEXT;

ALTER TABLE "SurveySubmission" ADD COLUMN "institutionNameSnapshot" TEXT,
ADD COLUMN "otherInstitutionText" TEXT,
ADD COLUMN "cityId" TEXT,
ADD COLUMN "cityNameSnapshot" TEXT,
ADD COLUMN "otherExpertiseText" TEXT;

ALTER TABLE "SurveyRankedExpertise" ADD COLUMN "categoryNameSnapshot" TEXT;

ALTER TABLE "SurveySubmissionInterest" ADD COLUMN "interestLabelSnapshot" TEXT;

-- CreateTable
CREATE TABLE "SurveyOtherProposal" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "proposalType" TEXT NOT NULL,
    "submittedText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mappedInstitutionId" TEXT,
    "mappedExpertiseId" TEXT,
    "mappedChoiceId" TEXT,
    "reviewedByAdminId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyOtherProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoiceAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changeClassification" TEXT NOT NULL DEFAULT 'minor_label',
    "beforeValue" TEXT,
    "afterValue" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChoiceAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionCategory_code_key" ON "InstitutionCategory"("code");
CREATE INDEX "InstitutionCategory_isActive_displayOrder_idx" ON "InstitutionCategory"("isActive", "displayOrder");

CREATE UNIQUE INDEX "CampaignInstitutionCategory_campaignId_categoryId_key" ON "CampaignInstitutionCategory"("campaignId", "categoryId");

CREATE UNIQUE INDEX "Institution_code_key" ON "Institution"("code");
CREATE INDEX "Institution_isActive_isSelectable_isHistorical_idx" ON "Institution"("isActive", "isSelectable", "isHistorical");
CREATE INDEX "Institution_categoryId_displayOrder_idx" ON "Institution"("categoryId", "displayOrder");

CREATE UNIQUE INDEX "InstitutionAlias_institutionId_normalizedAlias_key" ON "InstitutionAlias"("institutionId", "normalizedAlias");
CREATE INDEX "InstitutionAlias_normalizedAlias_idx" ON "InstitutionAlias"("normalizedAlias");

CREATE UNIQUE INDEX "InstitutionEmailDomain_institutionId_domain_key" ON "InstitutionEmailDomain"("institutionId", "domain");
CREATE INDEX "InstitutionEmailDomain_domain_idx" ON "InstitutionEmailDomain"("domain");

CREATE UNIQUE INDEX "SurveyChoiceSet_code_key" ON "SurveyChoiceSet"("code");

CREATE UNIQUE INDEX "SurveyChoice_choiceSetId_code_key" ON "SurveyChoice"("choiceSetId", "code");
CREATE INDEX "SurveyChoice_choiceSetId_isActive_displayOrder_idx" ON "SurveyChoice"("choiceSetId", "isActive", "displayOrder");

CREATE UNIQUE INDEX "CampaignChoiceAvailability_campaignId_choiceId_key" ON "CampaignChoiceAvailability"("campaignId", "choiceId");
CREATE UNIQUE INDEX "CampaignChoiceAvailability_campaignId_expertiseCategoryId_key" ON "CampaignChoiceAvailability"("campaignId", "expertiseCategoryId");
CREATE UNIQUE INDEX "CampaignChoiceAvailability_campaignId_engagementInterestId_key" ON "CampaignChoiceAvailability"("campaignId", "engagementInterestId");

CREATE INDEX "SurveyOtherProposal_status_proposalType_idx" ON "SurveyOtherProposal"("status", "proposalType");
CREATE INDEX "SurveyOtherProposal_submissionId_idx" ON "SurveyOtherProposal"("submissionId");

CREATE INDEX "ChoiceAuditLog_entityType_entityId_idx" ON "ChoiceAuditLog"("entityType", "entityId");
CREATE INDEX "ChoiceAuditLog_createdAt_idx" ON "ChoiceAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "CampaignInstitutionCategory" ADD CONSTRAINT "CampaignInstitutionCategory_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SurveyCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignInstitutionCategory" ADD CONSTRAINT "CampaignInstitutionCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InstitutionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Institution" ADD CONSTRAINT "Institution_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InstitutionCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_successorInstitutionId_fkey" FOREIGN KEY ("successorInstitutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InstitutionAlias" ADD CONSTRAINT "InstitutionAlias_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstitutionEmailDomain" ADD CONSTRAINT "InstitutionEmailDomain_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SurveyChoice" ADD CONSTRAINT "SurveyChoice_choiceSetId_fkey" FOREIGN KEY ("choiceSetId") REFERENCES "SurveyChoiceSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignChoiceAvailability" ADD CONSTRAINT "CampaignChoiceAvailability_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SurveyCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignChoiceAvailability" ADD CONSTRAINT "CampaignChoiceAvailability_choiceId_fkey" FOREIGN KEY ("choiceId") REFERENCES "SurveyChoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignChoiceAvailability" ADD CONSTRAINT "CampaignChoiceAvailability_expertiseCategoryId_fkey" FOREIGN KEY ("expertiseCategoryId") REFERENCES "ExpertiseCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignChoiceAvailability" ADD CONSTRAINT "CampaignChoiceAvailability_engagementInterestId_fkey" FOREIGN KEY ("engagementInterestId") REFERENCES "EngagementInterest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SurveyParticipant" ADD CONSTRAINT "SurveyParticipant_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "SurveyChoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SurveySubmission" ADD CONSTRAINT "SurveySubmission_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "SurveyChoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SurveyOtherProposal" ADD CONSTRAINT "SurveyOtherProposal_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "SurveySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
