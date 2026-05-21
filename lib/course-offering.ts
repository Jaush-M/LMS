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

type ActivateCourseOfferingInput = {
  courseOfferingId: string;
  activatedById: string;
};

export async function activateCourseOffering(input: ActivateCourseOfferingInput): Promise<{ id: string; status: string }> {
  const actor = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.activatedById } });
  if (actor.role !== "ADMINISTRATOR" && actor.role !== "SUPER_ADMINISTRATOR") {
    throw new Error("Only an Administrator can activate a Course Offering");
  }

  const offering = await prisma.courseOffering.findUniqueOrThrow({ where: { id: input.courseOfferingId } });

  if (offering.status !== "PLANNED") {
    throw new Error("Only a planned Course Offering can be activated");
  }

  return prisma.$transaction(async (tx) => {
    await tx.moduleOffering.updateMany({
      where: { courseOfferingId: input.courseOfferingId },
      data: { status: "ACTIVE" },
    });

    const updated = await tx.courseOffering.update({
      where: { id: input.courseOfferingId },
      data: { status: "ACTIVE" },
    });

    await tx.auditLogEntry.create({
      data: {
        eventType: "OPERATIONAL",
        action: "COURSE_OFFERING_ACTIVATED",
        actorId: input.activatedById,
        entityType: "CourseOffering",
        entityId: input.courseOfferingId,
        beforeJson: JSON.stringify({ status: "PLANNED" }),
        afterJson: JSON.stringify({ status: "ACTIVE" }),
      },
    });

    return { id: updated.id, status: updated.status };
  });
}

type CancelCourseOfferingInput = {
  courseOfferingId: string;
  cancelledById: string;
};

export async function cancelCourseOffering(input: CancelCourseOfferingInput): Promise<{ id: string; status: string }> {
  const actor = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.cancelledById } });
  if (actor.role !== "ADMINISTRATOR" && actor.role !== "SUPER_ADMINISTRATOR") {
    throw new Error("Only an Administrator can cancel a Course Offering");
  }

  const offering = await prisma.courseOffering.findUniqueOrThrow({ where: { id: input.courseOfferingId } });

  if (offering.status !== "PLANNED") {
    throw new Error("Only a planned Course Offering can be cancelled");
  }

  return prisma.$transaction(async (tx) => {
    await tx.moduleOffering.updateMany({
      where: { courseOfferingId: input.courseOfferingId },
      data: { status: "CANCELLED" },
    });

    const updated = await tx.courseOffering.update({
      where: { id: input.courseOfferingId },
      data: { status: "CANCELLED" },
    });

    await tx.auditLogEntry.create({
      data: {
        eventType: "OPERATIONAL",
        action: "COURSE_OFFERING_CANCELLED",
        actorId: input.cancelledById,
        entityType: "CourseOffering",
        entityId: input.courseOfferingId,
        beforeJson: JSON.stringify({ status: "PLANNED" }),
        afterJson: JSON.stringify({ status: "CANCELLED" }),
      },
    });

    return { id: updated.id, status: updated.status };
  });
}

type ArchiveCourseOfferingInput = {
  courseOfferingId: string;
  archivedById: string;
};

type ArchiveCourseOfferingResult = {
  id: string;
  status: string;
};

export async function archiveCourseOffering(input: ArchiveCourseOfferingInput): Promise<ArchiveCourseOfferingResult> {
  const actor = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.archivedById } });
  if (actor.role !== "ADMINISTRATOR" && actor.role !== "SUPER_ADMINISTRATOR") {
    throw new Error("Only an Administrator can archive a Course Offering");
  }

  const offering = await prisma.courseOffering.findUniqueOrThrow({
    where: { id: input.courseOfferingId },
    include: { moduleOfferings: { include: { moduleGroupChat: true } } },
  });

  if (offering.status === "ARCHIVED") {
    throw new Error("Course Offering is already archived");
  }

  const now = new Date();
  if (now < offering.finishAt) {
    throw new Error("Course Offering is not finished and cannot be archived");
  }

  return prisma.$transaction(async (tx) => {
    await tx.moduleOffering.updateMany({
      where: { courseOfferingId: input.courseOfferingId },
      data: { status: "ARCHIVED" },
    });

    for (const mo of offering.moduleOfferings) {
      if (mo.moduleGroupChat && !mo.moduleGroupChat.isReadOnly) {
        await tx.moduleGroupChat.update({
          where: { id: mo.moduleGroupChat.id },
          data: { isReadOnly: true },
        });
      }
    }

    await tx.auditLogEntry.create({
      data: {
        eventType: "OPERATIONAL",
        action: "COURSE_OFFERING_ARCHIVED",
        actorId: input.archivedById,
        entityType: "CourseOffering",
        entityId: input.courseOfferingId,
        beforeJson: JSON.stringify({ status: offering.status, finishAt: offering.finishAt }),
        afterJson: JSON.stringify({ status: "ARCHIVED" }),
      },
    });

    const updated = await tx.courseOffering.update({
      where: { id: input.courseOfferingId },
      data: { status: "ARCHIVED" },
    });

    return {
      id: updated.id,
      status: updated.status,
    };
  });
}

export async function isInMarkingWindow(courseOfferingId: string, now: Date = new Date()): Promise<boolean> {
  const settings = await prisma.systemSettings.findFirstOrThrow();
  const windowDays = settings.postCourseMarkingWindowDays;

  const offering = await prisma.courseOffering.findUniqueOrThrow({
    where: { id: courseOfferingId },
    select: { finishAt: true },
  });

  const windowEnd = new Date(offering.finishAt.getTime() + windowDays * 24 * 60 * 60 * 1000);

  return now >= offering.finishAt && now <= windowEnd;
}

type BulkArchiveCourseOfferingResult = {
  courseOfferingId: string;
  archived: boolean;
  error?: string;
};

type BulkArchiveCourseOfferingsInput = {
  courseOfferingIds: string[];
  archivedById: string;
};

export async function bulkArchiveCourseOfferings(input: BulkArchiveCourseOfferingsInput): Promise<BulkArchiveCourseOfferingResult[]> {
  const actor = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.archivedById } });
  if (actor.role !== "ADMINISTRATOR" && actor.role !== "SUPER_ADMINISTRATOR") {
    throw new Error("Only an Administrator can archive Course Offerings");
  }

  const results: BulkArchiveCourseOfferingResult[] = [];

  for (const courseOfferingId of input.courseOfferingIds) {
    try {
      await archiveCourseOffering({ courseOfferingId, archivedById: input.archivedById });
      results.push({ courseOfferingId, archived: true });
    } catch (error) {
      results.push({
        courseOfferingId,
        archived: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}
