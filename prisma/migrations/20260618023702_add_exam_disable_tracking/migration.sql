-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "disabledReason" TEXT,
ADD COLUMN     "reenableReason" TEXT;
