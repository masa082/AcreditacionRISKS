-- CreateEnum
CREATE TYPE "ReferrerStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "Referrer" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT,
    "code" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT,
    "bankAccountInfo" TEXT,
    "taxId" TEXT,
    "notes" TEXT,
    "status" "ReferrerStatus" NOT NULL DEFAULT 'ACTIVE',
    "consentAccepted" BOOLEAN NOT NULL DEFAULT false,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referrer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT,
    "referrerId" TEXT NOT NULL,
    "candidateId" TEXT,
    "enrollmentId" TEXT,
    "paymentId" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "discountAmount" DECIMAL(12,2),
    "rewardPercent" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "rewardAmount" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "confirmedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Referrer_code_key" ON "Referrer"("code");

-- CreateIndex
CREATE INDEX "Referrer_subscriberId_idx" ON "Referrer"("subscriberId");

-- CreateIndex
CREATE INDEX "Referrer_email_idx" ON "Referrer"("email");

-- CreateIndex
CREATE INDEX "Referral_referrerId_status_idx" ON "Referral"("referrerId", "status");

-- CreateIndex
CREATE INDEX "Referral_subscriberId_status_idx" ON "Referral"("subscriberId", "status");

-- CreateIndex
CREATE INDEX "Referral_enrollmentId_idx" ON "Referral"("enrollmentId");

-- AddForeignKey
ALTER TABLE "Referrer" ADD CONSTRAINT "Referrer_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Referrer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
