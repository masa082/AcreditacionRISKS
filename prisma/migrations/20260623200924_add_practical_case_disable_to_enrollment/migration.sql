-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "practicalCaseDisabledAt" TIMESTAMP(3),
ADD COLUMN     "practicalCaseDisabledReason" TEXT,
ADD COLUMN     "practicalCaseRenableReason" TEXT;
