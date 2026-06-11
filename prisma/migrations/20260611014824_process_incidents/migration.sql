-- CreateTable
CREATE TABLE "ProcessIncident" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "candidateId" TEXT,
    "enrollmentId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "severity" TEXT NOT NULL DEFAULT 'ERROR',
    "message" TEXT NOT NULL,
    "context" JSONB NOT NULL DEFAULT '{}',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcessIncident_subscriberId_resolvedAt_idx" ON "ProcessIncident"("subscriberId", "resolvedAt");

-- CreateIndex
CREATE INDEX "ProcessIncident_candidateId_resolvedAt_idx" ON "ProcessIncident"("candidateId", "resolvedAt");

-- CreateIndex
CREATE INDEX "ProcessIncident_enrollmentId_idx" ON "ProcessIncident"("enrollmentId");

-- AddForeignKey
ALTER TABLE "ProcessIncident" ADD CONSTRAINT "ProcessIncident_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessIncident" ADD CONSTRAINT "ProcessIncident_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessIncident" ADD CONSTRAINT "ProcessIncident_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
