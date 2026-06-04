-- AlterTable
ALTER TABLE "User" ADD COLUMN     "additionalEmails" TEXT[] DEFAULT ARRAY[]::TEXT[];
