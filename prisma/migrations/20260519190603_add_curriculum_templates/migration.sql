-- CreateEnum
CREATE TYPE "AssessmentComponentType" AS ENUM ('ONLINE_ASSIGNMENT', 'OFFLINE_ASSESSMENT');

-- CreateTable
CREATE TABLE "CurriculumTemplate" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" "CatalogueStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicLevel" (
    "id" TEXT NOT NULL,
    "curriculumTemplateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "expectedCredits" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateModule" (
    "id" TEXT NOT NULL,
    "curriculumTemplateId" TEXT NOT NULL,
    "academicLevelId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateModulePrerequisite" (
    "templateModuleId" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,

    CONSTRAINT "TemplateModulePrerequisite_pkey" PRIMARY KEY ("templateModuleId","prerequisiteId")
);

-- CreateTable
CREATE TABLE "DefaultAssessmentComponent" (
    "id" TEXT NOT NULL,
    "templateModuleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "AssessmentComponentType" NOT NULL,
    "weightPercent" DOUBLE PRECISION NOT NULL,
    "maximumMark" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DefaultAssessmentComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumTemplate_courseId_key" ON "CurriculumTemplate"("courseId");

-- AddForeignKey
ALTER TABLE "CurriculumTemplate" ADD CONSTRAINT "CurriculumTemplate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicLevel" ADD CONSTRAINT "AcademicLevel_curriculumTemplateId_fkey" FOREIGN KEY ("curriculumTemplateId") REFERENCES "CurriculumTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateModule" ADD CONSTRAINT "TemplateModule_curriculumTemplateId_fkey" FOREIGN KEY ("curriculumTemplateId") REFERENCES "CurriculumTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateModule" ADD CONSTRAINT "TemplateModule_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "AcademicLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateModule" ADD CONSTRAINT "TemplateModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateModulePrerequisite" ADD CONSTRAINT "TemplateModulePrerequisite_templateModuleId_fkey" FOREIGN KEY ("templateModuleId") REFERENCES "TemplateModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateModulePrerequisite" ADD CONSTRAINT "TemplateModulePrerequisite_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "TemplateModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefaultAssessmentComponent" ADD CONSTRAINT "DefaultAssessmentComponent_templateModuleId_fkey" FOREIGN KEY ("templateModuleId") REFERENCES "TemplateModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
