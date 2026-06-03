-- CreateEnum
CREATE TYPE "LeadKind" AS ENUM ('REGISTRATION', 'INFORMATION', 'ADVISORY');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'DISCARDED');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT,
    "kind" "LeadKind" NOT NULL DEFAULT 'REGISTRATION',
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT,
    "company" TEXT,
    "jobTitle" TEXT,
    "certificationOfInterest" TEXT,
    "message" TEXT,
    "suggestedDate" TIMESTAMP(3),
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "consentAccepted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "contactedAt" TIMESTAMP(3),
    "contactedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_subscriberId_status_idx" ON "Lead"("subscriberId", "status");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
