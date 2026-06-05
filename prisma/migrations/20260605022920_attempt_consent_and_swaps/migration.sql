-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "questionSwapsAllowed" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "ExamAttempt" ADD COLUMN     "consentAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "consentText" TEXT,
ADD COLUMN     "swapsUsed" INTEGER NOT NULL DEFAULT 0;
