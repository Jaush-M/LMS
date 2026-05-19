import { prisma } from "./prisma";
import type { ExceptionType } from "./generated/prisma/enums";

// ── calculateEffectiveModuleAccess ───────────────────────────────────────────

type ModuleOfferingRef = { id: string };
type ExceptionRef = { moduleOfferingId: string; exceptionType: ExceptionType | "INCLUDE" | "EXCLUDE" };

export function calculateEffectiveModuleAccess(
  activeModuleOfferings: ModuleOfferingRef[],
  exceptions: ExceptionRef[]
): ModuleOfferingRef[] {
  const excludedIds = new Set(
    exceptions.filter((e) => e.exceptionType === "EXCLUDE").map((e) => e.moduleOfferingId)
  );
  const includedIds = new Set(
    exceptions.filter((e) => e.exceptionType === "INCLUDE").map((e) => e.moduleOfferingId)
  );

  const base = activeModuleOfferings.filter((mo) => !excludedIds.has(mo.id));
  const existingIds = new Set(base.map((mo) => mo.id));

  for (const id of includedIds) {
    if (!existingIds.has(id)) {
      base.push({ id });
    }
  }

  return base;
}

// ── enrollStudent ─────────────────────────────────────────────────────────────

type EnrollStudentInput = {
  studentId: string;
  courseOfferingId: string;
  enrolledById: string;
  isMainEnrollment?: boolean;
  capacityOverride?: { reason: string };
};

type EnrollStudentResult =
  | { status: "enrolled"; enrollment: { id: string; studentId: string; courseOfferingId: string; isMainEnrollment: boolean; enrollmentStatus: string } }
  | { status: "capacity_exceeded"; currentCount: number; capacity: number };

export async function enrollStudent(params: EnrollStudentInput): Promise<EnrollStudentResult> {
  return prisma.$transaction(async (tx) => {
    const student = await tx.userAccount.findUniqueOrThrow({ where: { id: params.studentId } });
    if (student.role !== "STUDENT") {
      throw new Error("Only a Student account can be enrolled in a Course Offering");
    }

    const existing = await tx.enrollment.findUnique({
      where: { studentId_courseOfferingId: { studentId: params.studentId, courseOfferingId: params.courseOfferingId } },
    });
    if (existing) {
      throw new Error("Student is already enrolled in this Course Offering");
    }

    const courseOffering = await tx.courseOffering.findUniqueOrThrow({ where: { id: params.courseOfferingId } });
    const currentCount = await tx.enrollment.count({
      where: { courseOfferingId: params.courseOfferingId, status: "ACTIVE" },
    });

    if (currentCount >= courseOffering.capacity && !params.capacityOverride) {
      return { status: "capacity_exceeded" as const, currentCount, capacity: courseOffering.capacity };
    }

    if (params.isMainEnrollment) {
      await tx.enrollment.updateMany({
        where: { studentId: params.studentId, isMainEnrollment: true },
        data: { isMainEnrollment: false },
      });
    }

    const enrollment = await tx.enrollment.create({
      data: {
        studentId: params.studentId,
        courseOfferingId: params.courseOfferingId,
        enrolledById: params.enrolledById,
        isMainEnrollment: params.isMainEnrollment ?? false,
      },
    });

    if (params.capacityOverride) {
      await tx.capacityOverride.create({
        data: {
          enrollmentId: enrollment.id,
          reason: params.capacityOverride.reason,
          authorizedById: params.enrolledById,
        },
      });

      await tx.auditLogEntry.create({
        data: {
          eventType: "OPERATIONAL",
          action: "CAPACITY_OVERRIDE",
          actorId: params.enrolledById,
          entityType: "Enrollment",
          entityId: enrollment.id,
          reason: params.capacityOverride.reason,
        },
      });
    }

    return {
      status: "enrolled" as const,
      enrollment: {
        id: enrollment.id,
        studentId: enrollment.studentId,
        courseOfferingId: enrollment.courseOfferingId,
        isMainEnrollment: enrollment.isMainEnrollment,
        enrollmentStatus: enrollment.status,
      },
    };
  });
}

// ── createModuleEnrollmentException ─────────────────────────────────────────

type CreateModuleEnrollmentExceptionInput = {
  enrollmentId: string;
  moduleOfferingId: string;
  exceptionType: "INCLUDE" | "EXCLUDE";
  reason: string;
  createdById: string;
};

export async function createModuleEnrollmentException(params: CreateModuleEnrollmentExceptionInput) {
  return prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.findUniqueOrThrow({ where: { id: params.enrollmentId } });

    const moduleOffering = await tx.moduleOffering.findUniqueOrThrow({ where: { id: params.moduleOfferingId } });
    if (moduleOffering.courseOfferingId !== enrollment.courseOfferingId) {
      throw new Error("Module Offering does not belong to the enrollment's Course Offering");
    }

    const existing = await tx.moduleEnrollmentException.findUnique({
      where: {
        enrollmentId_moduleOfferingId: {
          enrollmentId: params.enrollmentId,
          moduleOfferingId: params.moduleOfferingId,
        },
      },
    });
    if (existing) {
      throw new Error("A Module Enrollment Exception already exists for this Module Offering in this Enrollment");
    }

    return tx.moduleEnrollmentException.create({
      data: {
        enrollmentId: params.enrollmentId,
        moduleOfferingId: params.moduleOfferingId,
        exceptionType: params.exceptionType,
        reason: params.reason,
        createdById: params.createdById,
      },
    });
  });
}

// ── setMainEnrollment ────────────────────────────────────────────────────────

export async function setMainEnrollment(enrollmentId: string) {
  return prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.findUniqueOrThrow({ where: { id: enrollmentId } });

    await tx.enrollment.updateMany({
      where: { studentId: enrollment.studentId, isMainEnrollment: true },
      data: { isMainEnrollment: false },
    });

    return tx.enrollment.update({
      where: { id: enrollmentId },
      data: { isMainEnrollment: true },
    });
  });
}

// ── bulkEnrollStudents ────────────────────────────────────────────────────────

type BulkEnrollInput = Omit<EnrollStudentInput, "studentId"> & { studentIds: string[] };

export async function bulkEnrollStudents(params: BulkEnrollInput) {
  const results = [];
  for (const studentId of params.studentIds) {
    results.push(await enrollStudent({ ...params, studentId }));
  }
  return results;
}
