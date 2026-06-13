-- CreateEnum
CREATE TYPE "InfoRequestStatus" AS ENUM ('PENDING', 'ANSWERED', 'DISMISSED');

-- CreateTable
CREATE TABLE "AttemptInfoRequest" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "InfoRequestStatus" NOT NULL DEFAULT 'PENDING',
    "candidateResponse" TEXT,
    "candidateFileUrl" TEXT,
    "candidateFileName" TEXT,
    "respondedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "closingNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttemptInfoRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttemptInfoRequest_attemptId_status_idx" ON "AttemptInfoRequest"("attemptId", "status");

-- CreateIndex
CREATE INDEX "AttemptInfoRequest_subscriberId_status_idx" ON "AttemptInfoRequest"("subscriberId", "status");

-- AddForeignKey
ALTER TABLE "AttemptInfoRequest" ADD CONSTRAINT "AttemptInfoRequest_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptInfoRequest" ADD CONSTRAINT "AttemptInfoRequest_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
