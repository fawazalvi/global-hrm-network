-- CreateTable
CREATE TABLE "AiApiKey" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'groq',
    "label" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "keyPreview" TEXT NOT NULL,
    "defaultModel" TEXT,
    "baseUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" TEXT,
    "lastTestMessage" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiApiKeyAuditLog" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "provider" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiApiKeyAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiApiKey_provider_isActive_idx" ON "AiApiKey"("provider", "isActive");

-- CreateIndex
CREATE INDEX "AiApiKey_provider_isDefault_idx" ON "AiApiKey"("provider", "isDefault");

-- CreateIndex
CREATE INDEX "AiApiKeyAuditLog_apiKeyId_createdAt_idx" ON "AiApiKeyAuditLog"("apiKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "AiApiKeyAuditLog_createdAt_idx" ON "AiApiKeyAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "AiApiKeyAuditLog" ADD CONSTRAINT "AiApiKeyAuditLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "AiApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
