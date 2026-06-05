-- CreateEnum
CREATE TYPE "LeadActivityType" AS ENUM ('NOTE', 'STATUS_CHANGE', 'EMAIL_SENT', 'QUOTE_SENT', 'WHATSAPP_OPEN', 'CALL', 'MEETING', 'VISIT_TRACK');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "lastSiteVisitAt" TIMESTAMP(3),
ADD COLUMN     "siteVisitCount" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "LeadActivityType" NOT NULL,
    "comment" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
