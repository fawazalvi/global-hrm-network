-- CreateTable
CREATE TABLE "EmailConfig" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "smtpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smtpHost" TEXT,
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpSecurity" TEXT NOT NULL DEFAULT 'starttls',
    "smtpAuthEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smtpUsername" TEXT,
    "smtpPasswordEncrypted" TEXT,
    "smtpConnectionTimeoutMs" INTEGER NOT NULL DEFAULT 10000,
    "smtpRateLimitPerMinute" INTEGER NOT NULL DEFAULT 30,
    "smtpMaxRetries" INTEGER NOT NULL DEFAULT 3,
    "fromDisplayName" TEXT NOT NULL DEFAULT 'Global HRM Network',
    "fromEmail" TEXT,
    "replyToEmail" TEXT,
    "supportEmail" TEXT,
    "footerText" TEXT,
    "websiteUrl" TEXT,
    "senderOverridesJson" TEXT,
    "imapEnabled" BOOLEAN NOT NULL DEFAULT false,
    "imapHost" TEXT,
    "imapPort" INTEGER NOT NULL DEFAULT 993,
    "imapSecurity" TEXT NOT NULL DEFAULT 'implicit_tls',
    "imapUsername" TEXT,
    "imapPasswordEncrypted" TEXT,
    "imapFolder" TEXT NOT NULL DEFAULT 'INBOX',
    "imapPollingIntervalSec" INTEGER NOT NULL DEFAULT 120,
    "imapInitialSyncMode" TEXT NOT NULL DEFAULT 'after_activation',
    "imapRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "imapActivatedAt" TIMESTAMP(3),
    "lastSmtpTestAt" TIMESTAMP(3),
    "lastSmtpTestSuccess" BOOLEAN,
    "lastSmtpTestMessage" TEXT,
    "lastSmtpTestedHash" TEXT,
    "lastImapTestAt" TIMESTAMP(3),
    "lastImapTestSuccess" BOOLEAN,
    "lastImapTestMessage" TEXT,
    "lastImapTestedHash" TEXT,
    "activatedAt" TIMESTAMP(3),
    "activatedByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailConfigAuditLog" (
    "id" TEXT NOT NULL,
    "configId" TEXT,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detailsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailConfigAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "footerText" TEXT NOT NULL,
    "ctaLabel" TEXT,
    "requiredPlaceholders" TEXT NOT NULL,
    "isCustomized" BOOLEAN NOT NULL DEFAULT false,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailOutbox" (
    "id" TEXT NOT NULL,
    "businessKey" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "campaignId" TEXT,
    "participantId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "normalizedRecipient" TEXT NOT NULL,
    "recipientName" TEXT,
    "fromAddress" TEXT NOT NULL,
    "replyToAddress" TEXT,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT,
    "textBody" TEXT,
    "containsSensitiveLink" BOOLEAN NOT NULL DEFAULT false,
    "payloadExpiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "messageId" TEXT,
    "smtpResponse" TEXT,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImapMailboxCursor" (
    "id" TEXT NOT NULL,
    "mailboxKey" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "uidValidity" BIGINT,
    "lastProcessedUid" INTEGER NOT NULL DEFAULT 0,
    "lastPolledAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImapMailboxCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundEmailMessage" (
    "id" TEXT NOT NULL,
    "mailboxKey" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "uidValidity" BIGINT NOT NULL,
    "uid" INTEGER NOT NULL,
    "messageId" TEXT,
    "inReplyTo" TEXT,
    "referencesHeader" TEXT,
    "fromAddress" TEXT,
    "fromName" TEXT,
    "toAddress" TEXT,
    "subject" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'received',
    "textPreview" TEXT,
    "sanitizedHtml" TEXT,
    "attachmentMetadataJson" TEXT,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "relatedOutboxId" TEXT,
    "relatedParticipantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundEmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailConfig_status_version_idx" ON "EmailConfig"("status", "version");

-- CreateIndex
CREATE INDEX "EmailConfigAuditLog_createdAt_idx" ON "EmailConfigAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "EmailConfigAuditLog_configId_idx" ON "EmailConfigAuditLog"("configId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_emailType_key" ON "EmailTemplate"("emailType");

-- CreateIndex
CREATE UNIQUE INDEX "EmailOutbox_businessKey_key" ON "EmailOutbox"("businessKey");

-- CreateIndex
CREATE UNIQUE INDEX "EmailOutbox_messageId_key" ON "EmailOutbox"("messageId");

-- CreateIndex
CREATE INDEX "EmailOutbox_status_nextAttemptAt_idx" ON "EmailOutbox"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "EmailOutbox_emailType_createdAt_idx" ON "EmailOutbox"("emailType", "createdAt");

-- CreateIndex
CREATE INDEX "EmailOutbox_normalizedRecipient_idx" ON "EmailOutbox"("normalizedRecipient");

-- CreateIndex
CREATE INDEX "EmailOutbox_campaignId_idx" ON "EmailOutbox"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "ImapMailboxCursor_mailboxKey_key" ON "ImapMailboxCursor"("mailboxKey");

-- CreateIndex
CREATE INDEX "InboundEmailMessage_receivedAt_idx" ON "InboundEmailMessage"("receivedAt");

-- CreateIndex
CREATE INDEX "InboundEmailMessage_messageId_idx" ON "InboundEmailMessage"("messageId");

-- CreateIndex
CREATE INDEX "InboundEmailMessage_inReplyTo_idx" ON "InboundEmailMessage"("inReplyTo");

-- CreateIndex
CREATE INDEX "InboundEmailMessage_relatedOutboxId_idx" ON "InboundEmailMessage"("relatedOutboxId");

-- CreateIndex
CREATE UNIQUE INDEX "InboundEmailMessage_mailboxKey_folder_uidValidity_uid_key" ON "InboundEmailMessage"("mailboxKey", "folder", "uidValidity", "uid");

-- AddForeignKey
ALTER TABLE "EmailConfigAuditLog" ADD CONSTRAINT "EmailConfigAuditLog_configId_fkey" FOREIGN KEY ("configId") REFERENCES "EmailConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
