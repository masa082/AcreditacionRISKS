-- CreateTable
CREATE TABLE "Documentation" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT,
    "category" TEXT,
    "pdfUrl" TEXT,
    "pdfSizeKB" INTEGER,
    "docxUrl" TEXT,
    "docxSizeKB" INTEGER,
    "audience" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "seedSlug" TEXT,
    "uploadedById" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Documentation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Documentation_seedSlug_key" ON "Documentation"("seedSlug");

-- CreateIndex
CREATE INDEX "Documentation_subscriberId_idx" ON "Documentation"("subscriberId");

-- CreateIndex
CREATE INDEX "Documentation_visible_idx" ON "Documentation"("visible");

-- CreateIndex
CREATE UNIQUE INDEX "Documentation_subscriberId_slug_key" ON "Documentation"("subscriberId", "slug");

-- AddForeignKey
ALTER TABLE "Documentation" ADD CONSTRAINT "Documentation_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documentation" ADD CONSTRAINT "Documentation_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
