-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "candidateId" TEXT,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyPreview" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'BULK',
    "template" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "providerId" TEXT,
    "errorMessage" TEXT,
    "sentById" TEXT,
    "groupId" TEXT,
    "scheduledEmailId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLog_subscriberId_sentAt_idx" ON "EmailLog"("subscriberId", "sentAt");

-- CreateIndex
CREATE INDEX "EmailLog_candidateId_sentAt_idx" ON "EmailLog"("candidateId", "sentAt");

-- CreateIndex
CREATE INDEX "EmailLog_groupId_idx" ON "EmailLog"("groupId");

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
