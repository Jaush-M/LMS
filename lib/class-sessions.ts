import { prisma } from "./prisma";

type CreateClassSessionInput = {
  moduleOfferingId: string;
  sessionTypeId: string;
  startAt: Date;
  finishAt: Date;
  sessionLocation?: string;
  attendanceRequired?: boolean;
  createdById: string;
};

type ConflictWarning = {
  type: "educator" | "student";
  affectedUserId: string;
  conflictingSessionId: string;
};

type CreateClassSessionResult = {
  session: {
    id: string;
    moduleOfferingId: string;
    sessionTypeId: string;
    startAt: Date;
    finishAt: Date;
    sessionLocation: string | null;
    attendanceRequired: boolean;
  };
  conflicts: ConflictWarning[];
};

function applyExceptions(
  moduleOfferingIds: string[],
  exceptions: Array<{ moduleOfferingId: string; exceptionType: string }>
): string[] {
  const excludedIds = new Set(
    exceptions.filter((e) => e.exceptionType === "EXCLUDE").map((e) => e.moduleOfferingId)
  );
  const includedIds = new Set(
    exceptions.filter((e) => e.exceptionType === "INCLUDE").map((e) => e.moduleOfferingId)
  );

  const base = moduleOfferingIds.filter((id) => !excludedIds.has(id));
  const existingSet = new Set(base);
  for (const id of includedIds) {
    if (!existingSet.has(id)) base.push(id);
  }
  return base;
}

async function resolveStudentsWithEffectiveAccess(
  moduleOfferingId: string,
  courseOfferingId: string
): Promise<Array<{ studentId: string }>> {
  const enrollments = await prisma.enrollment.findMany({
    where: { courseOfferingId, status: "ACTIVE" },
    select: {
      studentId: true,
      moduleEnrollmentExceptions: {
        select: { moduleOfferingId: true, exceptionType: true },
      },
    },
  });

  const defaultModuleOfferingIds = (
    await prisma.moduleOffering.findMany({
      where: { courseOfferingId },
      select: { id: true },
    })
  ).map((mo) => mo.id);

  return enrollments.filter((enrollment) => {
    const effectiveIds = applyExceptions(defaultModuleOfferingIds, enrollment.moduleEnrollmentExceptions);
    return effectiveIds.includes(moduleOfferingId);
  });
}

export async function createClassSession(input: CreateClassSessionInput): Promise<CreateClassSessionResult> {
  const creator = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.createdById } });
  if (creator.role !== "ADMINISTRATOR" && creator.role !== "SUPER_ADMINISTRATOR") {
    throw new Error("Only an Administrator can create a Class Session");
  }

  const moduleOffering = await prisma.moduleOffering.findUniqueOrThrow({
    where: { id: input.moduleOfferingId },
  });

  const session = await prisma.classSession.create({
    data: {
      moduleOfferingId: input.moduleOfferingId,
      sessionTypeId: input.sessionTypeId,
      startAt: input.startAt,
      finishAt: input.finishAt,
      sessionLocation: input.sessionLocation ?? null,
      attendanceRequired: input.attendanceRequired ?? true,
      createdById: input.createdById,
    },
  });

  const conflicts: ConflictWarning[] = [];

  // Educator conflict: any session for any module offering taught by the same educator that overlaps
  const educatorConflicts = await prisma.classSession.findMany({
    where: {
      id: { not: session.id },
      moduleOffering: { primaryEducatorId: moduleOffering.primaryEducatorId },
      startAt: { lt: input.finishAt },
      finishAt: { gt: input.startAt },
    },
    select: { id: true },
  });

  for (const conflict of educatorConflicts) {
    conflicts.push({
      type: "educator",
      affectedUserId: moduleOffering.primaryEducatorId,
      conflictingSessionId: conflict.id,
    });
  }

  // Student conflict: find students with effective module access to this module offering,
  // then check if any of those students have another session that overlaps.
  const studentsWithAccess = await resolveStudentsWithEffectiveAccess(
    moduleOffering.id,
    moduleOffering.courseOfferingId
  );

  if (studentsWithAccess.length > 0) {
    const studentIds = studentsWithAccess.map((s) => s.studentId);

    // Find all overlapping sessions (excluding the one just created)
    const overlappingSessions = await prisma.classSession.findMany({
      where: {
        id: { not: session.id },
        startAt: { lt: input.finishAt },
        finishAt: { gt: input.startAt },
      },
      select: { id: true, moduleOfferingId: true },
    });

    if (overlappingSessions.length > 0) {
      // For each student with effective access, check if they also have effective access to any conflicting session's module offering
      const reportedStudentSessions = new Set<string>();

      for (const conflictSession of overlappingSessions) {
        const conflictModuleOffering = await prisma.moduleOffering.findUniqueOrThrow({
          where: { id: conflictSession.moduleOfferingId },
          select: { courseOfferingId: true },
        });

        for (const { studentId } of studentsWithAccess) {
          const key = `${studentId}:${conflictSession.id}`;
          if (reportedStudentSessions.has(key)) continue;

          // Check if this student has an active enrollment in the conflicting session's course offering
          const enrollment = await prisma.enrollment.findUnique({
            where: { studentId_courseOfferingId: { studentId, courseOfferingId: conflictModuleOffering.courseOfferingId } },
            select: {
              status: true,
              moduleEnrollmentExceptions: { select: { moduleOfferingId: true, exceptionType: true } },
            },
          });
          if (!enrollment || enrollment.status !== "ACTIVE") continue;

          // Check effective access to the conflicting module offering
          const defaultIds = (
            await prisma.moduleOffering.findMany({
              where: { courseOfferingId: conflictModuleOffering.courseOfferingId },
              select: { id: true },
            })
          ).map((mo) => mo.id);

          const effectiveIds = applyExceptions(defaultIds, enrollment.moduleEnrollmentExceptions);
          if (effectiveIds.includes(conflictSession.moduleOfferingId)) {
            reportedStudentSessions.add(key);
            conflicts.push({
              type: "student",
              affectedUserId: studentId,
              conflictingSessionId: conflictSession.id,
            });
          }
        }
      }
    }
  }

  return {
    session: {
      id: session.id,
      moduleOfferingId: session.moduleOfferingId,
      sessionTypeId: session.sessionTypeId,
      startAt: session.startAt,
      finishAt: session.finishAt,
      sessionLocation: session.sessionLocation,
      attendanceRequired: session.attendanceRequired,
    },
    conflicts,
  };
}
