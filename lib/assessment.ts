import { prisma } from "./prisma";
import { calculateEffectiveModuleAccess } from "./enrollment";

// ── guards ────────────────────────────────────────────────────────────────────

async function assertCanManageAssessmentStructure(moduleOfferingId: string, actorId: string) {
  const actor = await prisma.userAccount.findUniqueOrThrow({ where: { id: actorId } });

  if (actor.role === "STUDENT") {
    throw new Error("Permission denied: Students may not manage Assessment Components");
  }

  if (actor.role === "ADMINISTRATOR" || actor.role === "SUPER_ADMINISTRATOR") {
    return actor;
  }

  const moduleOffering = await prisma.moduleOffering.findUniqueOrThrow({ where: { id: moduleOfferingId } });
  if (moduleOffering.primaryEducatorId !== actor.id) {
    throw new Error("Permission denied: Educator is not assigned to this Module Offering");
  }

  return actor;
}

// ── createAssessmentComponent ─────────────────────────────────────────────────

export type CreateAssessmentComponentInput = {
  moduleOfferingId: string;
  createdById: string;
  title: string;
  type: "ONLINE_ASSIGNMENT" | "OFFLINE_ASSESSMENT";
  weightPercent: number;
  maximumMark: number;
  sortOrder: number;
  assignmentId?: string;
};

export async function createAssessmentComponent(input: CreateAssessmentComponentInput) {
  await assertCanManageAssessmentStructure(input.moduleOfferingId, input.createdById);

  return prisma.assessmentComponent.create({
    data: {
      moduleOfferingId: input.moduleOfferingId,
      createdById: input.createdById,
      title: input.title,
      type: input.type,
      weightPercent: input.weightPercent,
      maximumMark: input.maximumMark,
      sortOrder: input.sortOrder,
      assignmentId: input.assignmentId ?? null,
    },
  });
}

// ── updateAssessmentComponent ─────────────────────────────────────────────────

export type UpdateAssessmentComponentInput = {
  id: string;
  updatedById: string;
  title?: string;
  weightPercent?: number;
  maximumMark?: number;
  sortOrder?: number;
};

export async function updateAssessmentComponent(input: UpdateAssessmentComponentInput) {
  const component = await prisma.assessmentComponent.findUniqueOrThrow({ where: { id: input.id } });
  await assertCanManageAssessmentStructure(component.moduleOfferingId, input.updatedById);

  const actor = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.updatedById } });
  if (actor.role === "EDUCATOR") {
    const markCount = await prisma.componentMark.count({ where: { assessmentComponentId: input.id } });
    if (markCount > 0) {
      throw new Error("Assessment Component is locked: marks exist for this component");
    }
  }

  return prisma.assessmentComponent.update({
    where: { id: input.id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.weightPercent !== undefined && { weightPercent: input.weightPercent }),
      ...(input.maximumMark !== undefined && { maximumMark: input.maximumMark }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
    },
  });
}

// ── listAssessmentComponents ──────────────────────────────────────────────────

export type ListAssessmentComponentsInput = {
  moduleOfferingId: string;
  viewerId: string;
};

export async function listAssessmentComponents(input: ListAssessmentComponentsInput) {
  const viewer = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.viewerId } });

  if (viewer.role === "STUDENT") {
    const moduleOffering = await prisma.moduleOffering.findUniqueOrThrow({ where: { id: input.moduleOfferingId } });
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId: input.viewerId, courseOfferingId: moduleOffering.courseOfferingId, status: "ACTIVE" },
      include: { moduleEnrollmentExceptions: { select: { moduleOfferingId: true, exceptionType: true } } },
    });
    if (!enrollment) throw new Error("Access denied");
    const allModuleOfferings = await prisma.moduleOffering.findMany({
      where: { courseOfferingId: moduleOffering.courseOfferingId },
      select: { id: true },
    });
    const effective = calculateEffectiveModuleAccess(allModuleOfferings, enrollment.moduleEnrollmentExceptions);
    if (!effective.some((mo) => mo.id === input.moduleOfferingId)) throw new Error("Access denied");
  }

  return prisma.assessmentComponent.findMany({
    where: { moduleOfferingId: input.moduleOfferingId },
    orderBy: { sortOrder: "asc" },
  });
}

// ── upsertComponentMark ───────────────────────────────────────────────────────

export type UpsertComponentMarkInput = {
  assessmentComponentId: string;
  studentId: string;
  markedById: string;
  score: number;
  feedback?: string;
};

export async function upsertComponentMark(input: UpsertComponentMarkInput) {
  const component = await prisma.assessmentComponent.findUniqueOrThrow({
    where: { id: input.assessmentComponentId },
  });
  await assertCanManageAssessmentStructure(component.moduleOfferingId, input.markedById);

  const student = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.studentId } });
  if (student.role !== "STUDENT") {
    throw new Error("Component marks can only be entered for Students");
  }

  const existing = await prisma.componentMark.findUnique({
    where: { assessmentComponentId_studentId: { assessmentComponentId: input.assessmentComponentId, studentId: input.studentId } },
  });

  if (existing?.status === "RELEASED") {
    throw new Error("Cannot update a released Component Mark");
  }

  const mark = await prisma.componentMark.upsert({
    where: {
      assessmentComponentId_studentId: {
        assessmentComponentId: input.assessmentComponentId,
        studentId: input.studentId,
      },
    },
    update: {
      score: input.score,
      feedback: input.feedback ?? null,
      markedById: input.markedById,
    },
    create: {
      assessmentComponentId: input.assessmentComponentId,
      studentId: input.studentId,
      markedById: input.markedById,
      score: input.score,
      feedback: input.feedback ?? null,
      status: "DRAFT",
    },
  });

  return mark;
}

// ── listComponentMarks ────────────────────────────────────────────────────────

export type ListComponentMarksInput = {
  assessmentComponentId: string;
  viewerId: string;
};

export async function listComponentMarks(input: ListComponentMarksInput) {
  const component = await prisma.assessmentComponent.findUniqueOrThrow({ where: { id: input.assessmentComponentId } });
  const viewer = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.viewerId } });

  if (viewer.role === "STUDENT") {
    return prisma.componentMark.findMany({
      where: {
        assessmentComponentId: input.assessmentComponentId,
        studentId: input.viewerId,
        status: "RELEASED",
      },
    });
  }

  await assertCanManageAssessmentStructure(component.moduleOfferingId, input.viewerId);
  return prisma.componentMark.findMany({
    where: { assessmentComponentId: input.assessmentComponentId },
    orderBy: { createdAt: "asc" },
  });
}

// ── releaseComponentMark ──────────────────────────────────────────────────────

export type ReleaseComponentMarkInput = {
  componentMarkId: string;
  releasedById: string;
};

export async function releaseComponentMark(input: ReleaseComponentMarkInput) {
  const mark = await prisma.componentMark.findUniqueOrThrow({
    where: { id: input.componentMarkId },
    include: { assessmentComponent: true },
  });
  await assertCanManageAssessmentStructure(mark.assessmentComponent.moduleOfferingId, input.releasedById);

  return prisma.$transaction(async (tx) => {
    const released = await tx.componentMark.update({
      where: { id: input.componentMarkId },
      data: { status: "RELEASED" },
    });

    await tx.notification.create({
      data: {
        recipientId: mark.studentId,
        sourceType: "COMPONENT_MARK",
        componentMarkId: input.componentMarkId,
        title: "A mark has been released for you",
      },
    });

    return released;
  });
}

// ── releaseFinalGrades ────────────────────────────────────────────────────────

export type ReleaseFinalGradesInput = {
  moduleOfferingId: string;
  releasedById: string;
};

export async function releaseFinalGrades(input: ReleaseFinalGradesInput) {
  await assertCanManageAssessmentStructure(input.moduleOfferingId, input.releasedById);

  const components = await prisma.assessmentComponent.findMany({
    where: { moduleOfferingId: input.moduleOfferingId },
    include: { componentMarks: true },
  });

  const totalWeight = components.reduce((sum, c) => sum + c.weightPercent, 0);
  if (Math.round(totalWeight) !== 100) {
    throw new Error(`Assessment Structure weights must total 100% before releasing Final Grades (current total: ${totalWeight}%)`);
  }

  const settings = await prisma.systemSettings.findFirst({ orderBy: { updatedAt: "desc" } });
  const passThreshold = settings?.passThresholdPercent ?? 50;

  const moduleOffering = await prisma.moduleOffering.findUniqueOrThrow({
    where: { id: input.moduleOfferingId },
    select: { courseOfferingId: true },
  });

  const enrollments = await prisma.enrollment.findMany({
    where: { courseOfferingId: moduleOffering.courseOfferingId, status: "ACTIVE" },
    include: {
      moduleEnrollmentExceptions: { select: { moduleOfferingId: true, exceptionType: true } },
    },
  });

  const allModuleOfferings = await prisma.moduleOffering.findMany({
    where: { courseOfferingId: moduleOffering.courseOfferingId },
    select: { id: true },
  });

  return prisma.$transaction(async (tx) => {
    const results: Awaited<ReturnType<typeof tx.finalGrade.upsert>>[] = [];

    for (const enrollment of enrollments) {
      const effective = calculateEffectiveModuleAccess(allModuleOfferings, enrollment.moduleEnrollmentExceptions);
      if (!effective.some((mo) => mo.id === input.moduleOfferingId)) continue;

      const studentId = enrollment.studentId;
      let percentage = 0;

      for (const component of components) {
        const mark = component.componentMarks.find((m) => m.studentId === studentId);
        if (mark) {
          percentage += (mark.score / component.maximumMark) * component.weightPercent;
        }
      }

      const isPassing = percentage >= passThreshold;

      const existing = await tx.finalGrade.findUnique({
        where: { moduleOfferingId_studentId: { moduleOfferingId: input.moduleOfferingId, studentId } },
      });
      if (existing?.status === "RELEASED") continue;

      const grade = await tx.finalGrade.upsert({
        where: { moduleOfferingId_studentId: { moduleOfferingId: input.moduleOfferingId, studentId } },
        update: { percentage, isPassing, status: "RELEASED", releasedById: input.releasedById },
        create: {
          moduleOfferingId: input.moduleOfferingId,
          studentId,
          percentage,
          isPassing,
          status: "RELEASED",
          releasedById: input.releasedById,
        },
      });

      await tx.notification.create({
        data: {
          recipientId: studentId,
          sourceType: "FINAL_GRADE",
          finalGradeId: grade.id,
          title: "Your Final Grade has been released",
        },
      });

      results.push(grade);
    }

    return results;
  });
}

// ── listFinalGrades ───────────────────────────────────────────────────────────

export type ListFinalGradesInput = {
  moduleOfferingId: string;
  viewerId: string;
};

export async function listFinalGrades(input: ListFinalGradesInput) {
  const viewer = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.viewerId } });

  if (viewer.role === "STUDENT") {
    return prisma.finalGrade.findMany({
      where: {
        moduleOfferingId: input.moduleOfferingId,
        studentId: input.viewerId,
        status: "RELEASED",
      },
    });
  }

  await assertCanManageAssessmentStructure(input.moduleOfferingId, input.viewerId);
  return prisma.finalGrade.findMany({
    where: { moduleOfferingId: input.moduleOfferingId },
    orderBy: { createdAt: "asc" },
  });
}

// ── correctComponentMark ──────────────────────────────────────────────────────

export type CorrectComponentMarkInput = {
  componentMarkId: string;
  correctedById: string;
  score: number;
  feedback?: string;
  reason: string;
};

export async function correctComponentMark(input: CorrectComponentMarkInput) {
  const mark = await prisma.componentMark.findUniqueOrThrow({
    where: { id: input.componentMarkId },
    include: { assessmentComponent: true },
  });
  await assertCanManageAssessmentStructure(mark.assessmentComponent.moduleOfferingId, input.correctedById);

  if (!input.reason.trim()) {
    throw new Error("A reason is required to correct a Component Mark");
  }

  if (mark.status !== "RELEASED") {
    throw new Error("Only Released Component Marks may be corrected");
  }

  return prisma.$transaction(async (tx) => {
    const corrected = await tx.componentMark.update({
      where: { id: input.componentMarkId },
      data: { score: input.score, feedback: input.feedback ?? null, markedById: input.correctedById },
    });

    await tx.markCorrection.create({
      data: {
        componentMarkId: input.componentMarkId,
        oldScore: mark.score,
        oldFeedback: mark.feedback ?? null,
        newScore: input.score,
        newFeedback: input.feedback ?? null,
        reason: input.reason,
        correctedById: input.correctedById,
      },
    });

    return corrected;
  });
}

// ── correctFinalGrade ─────────────────────────────────────────────────────────

export type CorrectFinalGradeInput = {
  finalGradeId: string;
  correctedById: string;
  percentage: number;
  reason: string;
};

export async function correctFinalGrade(input: CorrectFinalGradeInput) {
  const actor = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.correctedById } });

  if (actor.role !== "ADMINISTRATOR" && actor.role !== "SUPER_ADMINISTRATOR") {
    throw new Error("Permission denied: only Administrators may correct Final Grades");
  }

  if (!input.reason.trim()) {
    throw new Error("A reason is required to correct a Final Grade");
  }

  const grade = await prisma.finalGrade.findUniqueOrThrow({ where: { id: input.finalGradeId } });

  if (grade.status !== "RELEASED") {
    throw new Error("Only Released Final Grades may be corrected");
  }

  const settings = await prisma.systemSettings.findFirst({ orderBy: { updatedAt: "desc" } });
  const passThreshold = settings?.passThresholdPercent ?? 50;
  const isPassing = input.percentage >= passThreshold;

  return prisma.$transaction(async (tx) => {
    const corrected = await tx.finalGrade.update({
      where: { id: input.finalGradeId },
      data: { percentage: input.percentage, isPassing },
    });

    await tx.finalGradeCorrection.create({
      data: {
        finalGradeId: input.finalGradeId,
        oldPercentage: grade.percentage,
        oldIsPassing: grade.isPassing,
        newPercentage: input.percentage,
        newIsPassing: isPassing,
        reason: input.reason,
        approvedById: input.correctedById,
      },
    });

    await tx.auditLogEntry.create({
      data: {
        eventType: "OPERATIONAL",
        action: "FINAL_GRADE_CORRECTED",
        actorId: input.correctedById,
        entityType: "FinalGrade",
        entityId: input.finalGradeId,
        beforeJson: JSON.stringify({ percentage: grade.percentage, isPassing: grade.isPassing }),
        afterJson: JSON.stringify({ percentage: input.percentage, isPassing }),
        reason: input.reason,
      },
    });

    await tx.notification.create({
      data: {
        recipientId: grade.studentId,
        sourceType: "FINAL_GRADE",
        finalGradeId: input.finalGradeId,
        title: "Your Final Grade has been corrected",
      },
    });

    return corrected;
  });
}

// ── exportMarksCSV ────────────────────────────────────────────────────────────

export type ExportMarksCSVInput = {
  moduleOfferingId: string;
  requestedById: string;
};

export async function exportMarksCSV(input: ExportMarksCSVInput): Promise<string> {
  await assertCanManageAssessmentStructure(input.moduleOfferingId, input.requestedById);

  const components = await prisma.assessmentComponent.findMany({
    where: { moduleOfferingId: input.moduleOfferingId },
    orderBy: { sortOrder: "asc" },
    include: { componentMarks: { include: { student: true } } },
  });

  const moduleOffering = await prisma.moduleOffering.findUniqueOrThrow({
    where: { id: input.moduleOfferingId },
    select: { courseOfferingId: true },
  });

  const enrollments = await prisma.enrollment.findMany({
    where: { courseOfferingId: moduleOffering.courseOfferingId, status: "ACTIVE" },
    include: {
      student: { include: { user: true } },
      moduleEnrollmentExceptions: { select: { moduleOfferingId: true, exceptionType: true } },
    },
  });

  const allModuleOfferings = await prisma.moduleOffering.findMany({
    where: { courseOfferingId: moduleOffering.courseOfferingId },
    select: { id: true },
  });

  const finalGrades = await prisma.finalGrade.findMany({
    where: { moduleOfferingId: input.moduleOfferingId },
  });
  const finalGradeByStudent = new Map(finalGrades.map((g) => [g.studentId, g]));

  const componentHeaders = components.map((c) => `"${c.title} (/${c.maximumMark})"`).join(",");
  const header = `"Student Identifier","Name",${componentHeaders},"Final Grade (%)","Pass Status"`;

  const rows: string[] = [header];

  for (const enrollment of enrollments) {
    const effective = calculateEffectiveModuleAccess(allModuleOfferings, enrollment.moduleEnrollmentExceptions);
    if (!effective.some((mo) => mo.id === input.moduleOfferingId)) continue;

    const student = enrollment.student;
    const identifier = student.generatedIdentifier;
    const name = `"${student.user.name}"`;

    const markCols = components.map((c) => {
      const mark = c.componentMarks.find((m) => m.studentId === student.id);
      return mark !== undefined ? String(mark.score) : "";
    });

    const grade = finalGradeByStudent.get(student.id);
    const finalGradeCol = grade !== undefined ? grade.percentage.toFixed(2) : "";
    const passStatusCol = grade !== undefined ? (grade.isPassing ? "Pass" : "Fail") : "";

    rows.push(`"${identifier}",${name},${markCols.join(",")},${finalGradeCol},${passStatusCol}`);
  }

  return rows.join("\n");
}
