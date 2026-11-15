-- AlterTable
ALTER TABLE "ReferralInvitation" ADD COLUMN "invitedPreferredName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ReferralLink_campaignId_createdByParticipantId_key" ON "ReferralLink"("campaignId", "createdByParticipantId");
