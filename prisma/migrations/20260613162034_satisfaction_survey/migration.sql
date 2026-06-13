-- CreateTable
CREATE TABLE "SatisfactionSurvey" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "attemptId" TEXT,
    "examType" TEXT,
    "npsScore" INTEGER,
    "overallRating" INTEGER,
    "difficultyRating" INTEGER,
    "clarityRating" INTEGER,
    "platformRating" INTEGER,
    "comment" TEXT,
    "allowFollowup" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SatisfactionSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SatisfactionSurvey_attemptId_key" ON "SatisfactionSurvey"("attemptId");

-- CreateIndex
CREATE INDEX "SatisfactionSurvey_subscriberId_createdAt_idx" ON "SatisfactionSurvey"("subscriberId", "createdAt");

-- CreateIndex
CREATE INDEX "SatisfactionSurvey_candidateId_idx" ON "SatisfactionSurvey"("candidateId");

-- AddForeignKey
ALTER TABLE "SatisfactionSurvey" ADD CONSTRAINT "SatisfactionSurvey_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SatisfactionSurvey" ADD CONSTRAINT "SatisfactionSurvey_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SatisfactionSurvey" ADD CONSTRAINT "SatisfactionSurvey_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SatisfactionSurvey" ADD CONSTRAINT "SatisfactionSurvey_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
