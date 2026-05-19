import { prisma } from "./prisma";

type ModuleOfferingInput = {
  templateModuleId: string;
  primaryEducatorId: string;
  studyModeId?: string;
  startAt?: Date;
  finishAt?: Date;
};

type CreateCourseOfferingFromTemplateInput = {
  curriculumTemplateId: string;
  intakeId: string;
  studyModeId: string;
  name: string;
  startAt: Date;
  finishAt: Date;
  capacity?: number;
  moduleOfferings: ModuleOfferingInput[];
};

function assertActive(label: string, status: string) {
  if (status !== "ACTIVE") throw new Error(`${label} must be active`);
}

function assertDateRange(label: string, startAt: Date, finishAt: Date) {
  if (startAt >= finishAt) throw new Error(`${label} start date must be before finish date`);
}

function assertWithinCourseOfferingRange(moduleStartAt: Date, moduleFinishAt: Date, courseStartAt: Date, courseFinishAt: Date) {
  if (moduleStartAt < courseStartAt || moduleFinishAt > courseFinishAt) {
    throw new Error("Module Offering date range must fall within the Course Offering date range");
  }
}

export async function createCourseOfferingFromTemplate(params: CreateCourseOfferingFromTemplateInput) {
  assertDateRange("Course Offering", params.startAt, params.finishAt);
  if (params.capacity !== undefined && params.capacity < 1) {
    throw new Error("Course Offering capacity must be at least 1");
  }

  return prisma.$transaction(async (tx) => {
    const template = await tx.curriculumTemplate.findUniqueOrThrow({
      where: { id: params.curriculumTemplateId },
      include: {
        course: true,
        templateModules: {
          orderBy: { sortOrder: "asc" },
          include: { module: true },
        },
      },
    });
    assertActive("Curriculum Template", template.status);
    assertActive("Course", template.course.status);
    if (template.templateModules.length === 0) {
      throw new Error("Curriculum Template must have Template Modules before creating a Course Offering");
    }

    const [intake, studyMode] = await Promise.all([
      tx.intake.findUniqueOrThrow({ where: { id: params.intakeId } }),
      tx.studyMode.findUniqueOrThrow({ where: { id: params.studyModeId } }),
    ]);
    assertActive("Intake", intake.status);
    assertActive("Study Mode", studyMode.status);

    const assignmentsByTemplateModuleId = new Map<string, ModuleOfferingInput>();
    for (const assignment of params.moduleOfferings) {
      if (assignmentsByTemplateModuleId.has(assignment.templateModuleId)) {
        throw new Error("Each Template Module can only have one Module Offering assignment");
      }
      assignmentsByTemplateModuleId.set(assignment.templateModuleId, assignment);
    }

    const templateModuleIds = new Set(template.templateModules.map((templateModule) => templateModule.id));
    for (const assignment of params.moduleOfferings) {
      if (!templateModuleIds.has(assignment.templateModuleId)) {
        throw new Error("Module Offering assignment must belong to the selected Curriculum Template");
      }
    }
    for (const templateModule of template.templateModules) {
      if (!assignmentsByTemplateModuleId.has(templateModule.id)) {
        throw new Error("Every Template Module needs a Module Offering educator assignment");
      }
      assertActive("Module", templateModule.module.status);
    }

    const educatorIds = [...new Set(params.moduleOfferings.map((assignment) => assignment.primaryEducatorId))];
    const educators = await tx.userAccount.findMany({ where: { id: { in: educatorIds } } });
    const educatorsById = new Map(educators.map((educator) => [educator.id, educator]));
    for (const educatorId of educatorIds) {
      const educator = educatorsById.get(educatorId);
      if (!educator || educator.role !== "EDUCATOR") {
        throw new Error("Module Offering primary educator must be an Educator account");
      }
    }

    const overrideStudyModeIds = [
      ...new Set(params.moduleOfferings.map((assignment) => assignment.studyModeId).filter((id): id is string => Boolean(id))),
    ];
    if (overrideStudyModeIds.length) {
      const overrideStudyModes = await tx.studyMode.findMany({ where: { id: { in: overrideStudyModeIds } } });
      const activeOverrideStudyModeIds = new Set(
        overrideStudyModes.filter((overrideStudyMode) => overrideStudyMode.status === "ACTIVE").map((overrideStudyMode) => overrideStudyMode.id)
      );
      for (const studyModeId of overrideStudyModeIds) {
        if (!activeOverrideStudyModeIds.has(studyModeId)) {
          throw new Error("Module Offering study mode override must be active");
        }
      }
    }

    return tx.courseOffering.create({
      data: {
        courseId: template.courseId,
        intakeId: params.intakeId,
        studyModeId: params.studyModeId,
        name: params.name,
        startAt: params.startAt,
        finishAt: params.finishAt,
        capacity: params.capacity ?? 24,
        moduleOfferings: {
          create: template.templateModules.map((templateModule) => {
            const assignment = assignmentsByTemplateModuleId.get(templateModule.id)!;
            const moduleStartAt = assignment.startAt ?? params.startAt;
            const moduleFinishAt = assignment.finishAt ?? params.finishAt;
            assertDateRange("Module Offering", moduleStartAt, moduleFinishAt);
            assertWithinCourseOfferingRange(moduleStartAt, moduleFinishAt, params.startAt, params.finishAt);

            return {
              templateModuleId: templateModule.id,
              primaryEducatorId: assignment.primaryEducatorId,
              studyModeId: assignment.studyModeId ?? null,
              startAt: moduleStartAt,
              finishAt: moduleFinishAt,
              moduleGroupChat: { create: {} },
            };
          }),
        },
      },
      include: {
        moduleOfferings: {
          include: { moduleGroupChat: true },
        },
      },
    });
  });
}
