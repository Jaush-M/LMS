-- DropForeignKey
ALTER TABLE "TemplateModule" DROP CONSTRAINT "TemplateModule_academicLevelId_fkey";

-- DropForeignKey
ALTER TABLE "TemplateModulePrerequisite" DROP CONSTRAINT "TemplateModulePrerequisite_prerequisiteId_fkey";

-- AddForeignKey
ALTER TABLE "TemplateModule" ADD CONSTRAINT "TemplateModule_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "AcademicLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateModulePrerequisite" ADD CONSTRAINT "TemplateModulePrerequisite_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "TemplateModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
