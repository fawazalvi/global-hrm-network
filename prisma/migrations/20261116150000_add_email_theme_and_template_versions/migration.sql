-- CreateTable
CREATE TABLE "EmailThemeConfig" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "logoPath" TEXT NOT NULL DEFAULT '/email-assets/ghrm-email-logo.png',
    "bannerPath" TEXT NOT NULL DEFAULT '/email-assets/ghrm-community-banner.jpg',
    "primaryColor" TEXT NOT NULL DEFAULT '#0868B5',
    "deepBlueColor" TEXT NOT NULL DEFAULT '#123B70',
    "orangeAccent" TEXT NOT NULL DEFAULT '#F58220',
    "greenAccent" TEXT NOT NULL DEFAULT '#8DBB32',
    "paleBgColor" TEXT NOT NULL DEFAULT '#EFF6FC',
    "bodyTextColor" TEXT NOT NULL DEFAULT '#263445',
    "secondaryTextColor" TEXT NOT NULL DEFAULT '#5C6B7A',
    "surfaceColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "headerStyle" TEXT NOT NULL DEFAULT 'light_logo_ribbon',
    "footerStyle" TEXT NOT NULL DEFAULT 'corporate_ribbon',
    "senderDisplayName" TEXT NOT NULL DEFAULT 'Global HRM Network',
    "supportEmail" TEXT,
    "websiteUrl" TEXT NOT NULL DEFAULT 'https://www.global-hrm.net',
    "tagline" TEXT NOT NULL DEFAULT 'Connecting HR Leaders Worldwide',
    "footerTagline" TEXT NOT NULL DEFAULT 'Empowering HR Professionals to Connect, Learn & Grow Globally.',
    "socialLinksJson" TEXT NOT NULL DEFAULT '[]',
    "updatedByUserId" TEXT,
    "updatedByEmail" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailThemeConfig_pkey" PRIMARY KEY ("id")
);

-- AlterTable EmailTemplate
ALTER TABLE "EmailTemplate"
    ADD COLUMN "classification" TEXT NOT NULL DEFAULT 'transactional',
    ADD COLUMN "variant" TEXT NOT NULL DEFAULT 'transactional',
    ADD COLUMN "status" TEXT NOT NULL DEFAULT 'published',
    ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "preheader" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "eyebrow" TEXT,
    ADD COLUMN "greeting" TEXT NOT NULL DEFAULT 'Hello {{preferred_name}},',
    ADD COLUMN "infoPanelTitle" TEXT,
    ADD COLUMN "infoPanelBody" TEXT,
    ADD COLUMN "ctaUrlTemplate" TEXT,
    ADD COLUMN "bannerKey" TEXT,
    ADD COLUMN "updatedByEmail" TEXT,
    ADD COLUMN "publishedAt" TIMESTAMP(3),
    ADD COLUMN "publishedByUserId" TEXT,
    ADD COLUMN "publishedByEmail" TEXT;

-- CreateTable
CREATE TABLE "EmailTemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "snapshotJson" TEXT NOT NULL,
    "changedByUserId" TEXT,
    "changedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- AlterTable EmailOutbox
ALTER TABLE "EmailOutbox"
    ADD COLUMN "templateVersion" INTEGER;

-- CreateIndex
CREATE INDEX "EmailThemeConfig_status_version_idx" ON "EmailThemeConfig"("status", "version");

-- CreateIndex
CREATE INDEX "EmailTemplateVersion_templateId_version_idx" ON "EmailTemplateVersion"("templateId", "version");

-- CreateIndex
CREATE INDEX "EmailTemplateVersion_emailType_version_idx" ON "EmailTemplateVersion"("emailType", "version");

-- AddForeignKey
ALTER TABLE "EmailTemplateVersion" ADD CONSTRAINT "EmailTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
