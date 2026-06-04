-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM ('SUGGESTION', 'IMPROVEMENT', 'DEVELOPMENT', 'BUG', 'PRAISE', 'OTHER');

-- CreateEnum
CREATE TYPE "FeedbackPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "FeedbackTicket" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "subscriberId" TEXT,
    "userId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "authorRole" TEXT,
    "category" "FeedbackCategory" NOT NULL DEFAULT 'SUGGESTION',
    "priority" "FeedbackPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contextUrl" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "respondedById" TEXT,
    "internalNotes" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackTicket_number_key" ON "FeedbackTicket"("number");

-- CreateIndex
CREATE INDEX "FeedbackTicket_status_idx" ON "FeedbackTicket"("status");

-- CreateIndex
CREATE INDEX "FeedbackTicket_category_idx" ON "FeedbackTicket"("category");

-- CreateIndex
CREATE INDEX "FeedbackTicket_subscriberId_idx" ON "FeedbackTicket"("subscriberId");

-- CreateIndex
CREATE INDEX "FeedbackTicket_userId_idx" ON "FeedbackTicket"("userId");

-- AddForeignKey
ALTER TABLE "FeedbackTicket" ADD CONSTRAINT "FeedbackTicket_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackTicket" ADD CONSTRAINT "FeedbackTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
