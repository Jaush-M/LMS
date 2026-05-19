-- CreateEnum
CREATE TYPE "ComponentMarkStatus" AS ENUM ('DRAFT', 'RELEASED');

-- CreateEnum
CREATE TYPE "FinalGradeStatus" AS ENUM ('PROVISIONAL', 'RELEASED');

-- AlterEnum
ALTER TYPE "NotificationSourceType" ADD VALUE 'COMPONENT_MARK';
ALTER TYPE "NotificationSourceType" ADD VALUE 'FINAL_GRADE';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "componentMarkId" TEXT,
ADD COLUMN     "finalGradeId" TEXT;

-- CreateTable
CREATE TABLE "AssessmentComponent" (
    "id" TEXT NOT NULL,
    "moduleOfferingId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "title" TEXT NOT NULL,
    "type" "AssessmentComponentType" NOT NULL,
    "weightPercent" DOUBLE PRECISION NOT NULL,
    "maximumMark" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentMark" (
    "id" TEXT NOT NULL,
    "assessmentComponentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "status" "ComponentMarkStatus" NOT NULL DEFAULT 'DRAFT',
    "markedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComponentMark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalGrade" (
    "id" TEXT NOT NULL,
    "moduleOfferingId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "isPassing" BOOLEAN NOT NULL,
    "status" "FinalGradeStatus" NOT NULL DEFAULT 'PROVISIONAL',
    "releasedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinalGrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentComponent_assignmentId_key" ON "AssessmentComponent"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentMark_assessmentComponentId_studentId_key" ON "ComponentMark"("assessmentComponentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "FinalGrade_moduleOfferingId_studentId_key" ON "FinalGrade"("moduleOfferingId", "studentId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_componentMarkId_fkey" FOREIGN KEY ("componentMarkId") REFERENCES "ComponentMark"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_finalGradeId_fkey" FOREIGN KEY ("finalGradeId") REFERENCES "FinalGrade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentComponent" ADD CONSTRAINT "AssessmentComponent_moduleOfferingId_fkey" FOREIGN KEY ("moduleOfferingId") REFERENCES "ModuleOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentComponent" ADD CONSTRAINT "AssessmentComponent_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentComponent" ADD CONSTRAINT "AssessmentComponent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentMark" ADD CONSTRAINT "ComponentMark_assessmentComponentId_fkey" FOREIGN KEY ("assessmentComponentId") REFERENCES "AssessmentComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentMark" ADD CONSTRAINT "ComponentMark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentMark" ADD CONSTRAINT "ComponentMark_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalGrade" ADD CONSTRAINT "FinalGrade_moduleOfferingId_fkey" FOREIGN KEY ("moduleOfferingId") REFERENCES "ModuleOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalGrade" ADD CONSTRAINT "FinalGrade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalGrade" ADD CONSTRAINT "FinalGrade_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
