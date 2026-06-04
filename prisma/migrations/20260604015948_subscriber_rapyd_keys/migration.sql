-- AlterTable
ALTER TABLE "Subscriber" ADD COLUMN     "rapydAccessKey" TEXT,
ADD COLUMN     "rapydEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rapydEnv" TEXT NOT NULL DEFAULT 'sandbox',
ADD COLUMN     "rapydMerchantNote" TEXT,
ADD COLUMN     "rapydSecretKey" TEXT;
