-- CreateTable
CREATE TABLE "SurveyLeadInvite" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "outboxId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "normalizedRecipient" TEXT NOT NULL,
    "recipientName" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "openedAt" TIMESTAMP(3),
    "lastOpenedAt" TIMESTAMP(3),
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "submissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyLeadInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurveyLeadInvite_tokenHash_key" ON "SurveyLeadInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "SurveyLeadInvite_campaignId_normalizedRecipient_idx" ON "SurveyLeadInvite"("campaignId", "normalizedRecipient");

-- CreateIndex
CREATE INDEX "SurveyLeadInvite_outboxId_idx" ON "SurveyLeadInvite"("outboxId");

-- CreateIndex
CREATE INDEX "SurveyLeadInvite_expiresAt_idx" ON "SurveyLeadInvite"("expiresAt");
