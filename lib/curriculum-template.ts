import { prisma } from "./prisma";
import type { AssessmentComponentType } from "./generated/prisma/enums";

const DEFAULT_FULL_TIME_CREDITS = 120;

// ── Curriculum Template ───────────────────────────────────────────────────

export async function createCurriculumTemplate(courseId: string) {
  const existing = await prisma.curriculumTemplate.findUnique({ where: { courseId } });
  if (existing) throw new Error(`Course already has a curriculum template`);
  return prisma.curriculumTemplate.create({ data: { courseId } });
}

export async function getCurriculumTemplate(templateId: string) {
  return prisma.curriculumTemplate.findUniqueOrThrow({
    where: { id: templateId },
    include: {
      academicLevels: {
        orderBy: { sortOrder: "asc" },
        include: {
          templateModules: {
            orderBy: { sortOrder: "asc" },
            include: {
              prerequisites: true,
              defaultAssessmentComponents: true,
            },
          },
        },
      },
    },
  });
}

export async function markCurriculumTemplateInactive(templateId: string) {
  const template = await prisma.curriculumTemplate.findUniqueOrThrow({ where: { id: templateId } });
  if (template.status !== "ACTIVE") {
    throw new Error(`Cannot mark inactive: curriculum template status is ${template.status}`);
  }
  return prisma.curriculumTemplate.update({ where: { id: templateId }, data: { status: "INACTIVE" } });
}

export async function markCurriculumTemplateActive(templateId: string) {
  const template = await prisma.curriculumTemplate.findUniqueOrThrow({ where: { id: templateId } });
  if (template.status !== "INACTIVE") {
    throw new Error(`Cannot mark active: curriculum template status is ${template.status}`);
  }
  return prisma.curriculumTemplate.update({ where: { id: templateId }, data: { status: "ACTIVE" } });
}

// ── Academic Level ────────────────────────────────────────────────────────

export async function addAcademicLevel(
  templateId: string,
  params: { label: string; sortOrder: number; expectedCredits?: number }
) {
  return prisma.academicLevel.create({
    data: {
      curriculumTemplateId: templateId,
      label: params.label,
      sortOrder: params.sortOrder,
      expectedCredits: params.expectedCredits ?? null,
    },
  });
}

export async function editAcademicLevel(
  levelId: string,
  patch: { label?: string; sortOrder?: number; expectedCredits?: number | null }
) {
  return prisma.academicLevel.update({ where: { id: levelId }, data: patch });
}

export async function removeAcademicLevel(levelId: string) {
  await prisma.academicLevel.delete({ where: { id: levelId } });
}

// ── Template Module ───────────────────────────────────────────────────────

export async function addTemplateModule(
  templateId: string,
  params: { academicLevelId: string; moduleId: string; credits: number; sortOrder: number }
) {
  const mod = await prisma.module.findUniqueOrThrow({ where: { id: params.moduleId } });
  if (mod.status !== "ACTIVE") {
    throw new Error(`Cannot add inactive module to curriculum template`);
  }
  return prisma.templateModule.create({
    data: {
      curriculumTemplateId: templateId,
      academicLevelId: params.academicLevelId,
      moduleId: params.moduleId,
      credits: params.credits,
      sortOrder: params.sortOrder,
    },
  });
}

export async function editTemplateModule(
  templateModuleId: string,
  patch: { credits?: number; sortOrder?: number }
) {
  return prisma.templateModule.update({ where: { id: templateModuleId }, data: patch });
}

export async function removeTemplateModule(templateModuleId: string) {
  await prisma.templateModule.delete({ where: { id: templateModuleId } });
}

// ── Prerequisites ─────────────────────────────────────────────────────────

export async function addPrerequisite(templateModuleId: string, prerequisiteId: string) {
  const [tm, prereq] = await Promise.all([
    prisma.templateModule.findUniqueOrThrow({ where: { id: templateModuleId } }),
    prisma.templateModule.findUniqueOrThrow({ where: { id: prerequisiteId } }),
  ]);
  if (tm.curriculumTemplateId !== prereq.curriculumTemplateId) {
    throw new Error(`cross-template prerequisites are not allowed`);
  }
  await prisma.templateModulePrerequisite.create({
    data: { templateModuleId, prerequisiteId },
  });
}

export async function removePrerequisite(templateModuleId: string, prerequisiteId: string) {
  await prisma.templateModulePrerequisite.delete({
    where: { templateModuleId_prerequisiteId: { templateModuleId, prerequisiteId } },
  });
}

// ── Default Assessment Components ─────────────────────────────────────────

export async function addDefaultAssessmentComponent(
  templateModuleId: string,
  params: { title: string; type: AssessmentComponentType; weightPercent: number; maximumMark: number }
) {
  return prisma.defaultAssessmentComponent.create({
    data: {
      templateModuleId,
      title: params.title,
      type: params.type,
      weightPercent: params.weightPercent,
      maximumMark: params.maximumMark,
    },
  });
}

export async function removeDefaultAssessmentComponent(componentId: string) {
  await prisma.defaultAssessmentComponent.delete({ where: { id: componentId } });
}

// ── Credit Warning ────────────────────────────────────────────────────────

export async function checkCreditWarning(levelId: string) {
  const level = await prisma.academicLevel.findUniqueOrThrow({
    where: { id: levelId },
    include: { templateModules: true },
  });
  const total = level.templateModules.reduce((sum, tm) => sum + tm.credits, 0);
  const expected = level.expectedCredits ?? DEFAULT_FULL_TIME_CREDITS;
  if (total === expected) return null;
  return { total, expected };
}
