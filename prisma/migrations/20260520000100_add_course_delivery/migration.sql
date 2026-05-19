-- CreateEnum
CREATE TYPE "OfferingStatus" AS ENUM ('PLANNED', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "CourseOffering" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "intakeId" TEXT NOT NULL,
    "studyModeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "finishAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 24,
    "status" "OfferingStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleOffering" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "templateModuleId" TEXT NOT NULL,
    "primaryEducatorId" TEXT NOT NULL,
    "studyModeId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "finishAt" TIMESTAMP(3) NOT NULL,
    "status" "OfferingStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleGroupChat" (
    "id" TEXT NOT NULL,
    "moduleOfferingId" TEXT NOT NULL,
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleGroupChat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseOffering_courseId_intakeId_key" ON "CourseOffering"("courseId", "intakeId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleOffering_courseOfferingId_templateModuleId_key" ON "ModuleOffering"("courseOfferingId", "templateModuleId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleGroupChat_moduleOfferingId_key" ON "ModuleGroupChat"("moduleOfferingId");

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "Intake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_studyModeId_fkey" FOREIGN KEY ("studyModeId") REFERENCES "StudyMode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleOffering" ADD CONSTRAINT "ModuleOffering_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleOffering" ADD CONSTRAINT "ModuleOffering_templateModuleId_fkey" FOREIGN KEY ("templateModuleId") REFERENCES "TemplateModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleOffering" ADD CONSTRAINT "ModuleOffering_primaryEducatorId_fkey" FOREIGN KEY ("primaryEducatorId") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleOffering" ADD CONSTRAINT "ModuleOffering_studyModeId_fkey" FOREIGN KEY ("studyModeId") REFERENCES "StudyMode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleGroupChat" ADD CONSTRAINT "ModuleGroupChat_moduleOfferingId_fkey" FOREIGN KEY ("moduleOfferingId") REFERENCES "ModuleOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
