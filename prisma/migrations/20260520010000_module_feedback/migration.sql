-- CreateEnum
CREATE TYPE "FeedbackResponseStatus" AS ENUM ('ACTIVE', 'MODERATED');

-- CreateTable
CREATE TABLE "FeedbackPeriod" (
    "id" TEXT NOT NULL,
    "moduleOfferingId" TEXT NOT NULL,
    "openAt" TIMESTAMP(3) NOT NULL,
    "closeAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackResponse" (
    "id" TEXT NOT NULL,
    "feedbackPeriodId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "FeedbackResponseStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackPeriod_moduleOfferingId_key" ON "FeedbackPeriod"("moduleOfferingId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackResponse_feedbackPeriodId_studentId_key" ON "FeedbackResponse"("feedbackPeriodId", "studentId");

-- AddForeignKey
ALTER TABLE "FeedbackPeriod" ADD CONSTRAINT "FeedbackPeriod_moduleOfferingId_fkey" FOREIGN KEY ("moduleOfferingId") REFERENCES "ModuleOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackPeriod" ADD CONSTRAINT "FeedbackPeriod_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackResponse" ADD CONSTRAINT "FeedbackResponse_feedbackPeriodId_fkey" FOREIGN KEY ("feedbackPeriodId") REFERENCES "FeedbackPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackResponse" ADD CONSTRAINT "FeedbackResponse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
