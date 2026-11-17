-- CreateTable
CREATE TABLE "LeadContact" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "fullName" TEXT,
    "institutionId" TEXT,
    "institutionName" TEXT,
    "designation" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceUrl" TEXT,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadCampaignMembership" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "assignedByUserId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadCampaignMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAuditLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detailsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadAuditLog_pkey" PRIMARY KEY ("id")
);

-- AlterTable SurveyLeadInvite
ALTER TABLE "SurveyLeadInvite" ADD COLUMN "leadId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LeadContact_normalizedEmail_key" ON "LeadContact"("normalizedEmail");
CREATE INDEX "LeadContact_isArchived_createdAt_idx" ON "LeadContact"("isArchived", "createdAt");
CREATE INDEX "LeadContact_institutionId_idx" ON "LeadContact"("institutionId");
CREATE INDEX "LeadContact_source_idx" ON "LeadContact"("source");

CREATE UNIQUE INDEX "LeadCampaignMembership_leadId_campaignId_key" ON "LeadCampaignMembership"("leadId", "campaignId");
CREATE INDEX "LeadCampaignMembership_campaignId_idx" ON "LeadCampaignMembership"("campaignId");

CREATE INDEX "LeadAuditLog_leadId_createdAt_idx" ON "LeadAuditLog"("leadId", "createdAt");
CREATE INDEX "LeadAuditLog_createdAt_idx" ON "LeadAuditLog"("createdAt");

CREATE INDEX "SurveyLeadInvite_leadId_idx" ON "SurveyLeadInvite"("leadId");

-- AddForeignKey
ALTER TABLE "SurveyLeadInvite" ADD CONSTRAINT "SurveyLeadInvite_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "LeadContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadContact" ADD CONSTRAINT "LeadContact_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadCampaignMembership" ADD CONSTRAINT "LeadCampaignMembership_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "LeadContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadCampaignMembership" ADD CONSTRAINT "LeadCampaignMembership_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SurveyCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadAuditLog" ADD CONSTRAINT "LeadAuditLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "LeadContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Non-destructive backfill: create LeadContact rows from existing SurveyLeadInvite records
INSERT INTO "LeadContact" ("id", "email", "normalizedEmail", "fullName", "source", "createdAt", "updatedAt")
SELECT DISTINCT ON (sli."normalizedRecipient")
  gen_random_uuid()::text,
  sli."recipientEmail",
  sli."normalizedRecipient",
  sli."recipientName",
  'legacy_invite',
  sli."createdAt",
  NOW()
FROM "SurveyLeadInvite" sli
ORDER BY sli."normalizedRecipient", sli."createdAt" ASC
ON CONFLICT ("normalizedEmail") DO NOTHING;

-- Link existing SurveyLeadInvite rows to their LeadContact
UPDATE "SurveyLeadInvite" sli
SET "leadId" = lc."id"
FROM "LeadContact" lc
WHERE sli."normalizedRecipient" = lc."normalizedEmail"
  AND sli."leadId" IS NULL;

-- Backfill LeadCampaignMembership from existing SurveyLeadInvite records
INSERT INTO "LeadCampaignMembership" ("id", "leadId", "campaignId", "assignedAt")
SELECT DISTINCT ON (lc."id", sli."campaignId")
  gen_random_uuid()::text,
  lc."id",
  sli."campaignId",
  sli."createdAt"
FROM "SurveyLeadInvite" sli
JOIN "LeadContact" lc ON lc."id" = sli."leadId"
ON CONFLICT ("leadId", "campaignId") DO NOTHING;
