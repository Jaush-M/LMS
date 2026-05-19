import { prisma } from "./prisma";
import { calculateEffectiveModuleAccess } from "./enrollment";
import { isInMarkingWindow } from "./course-offering";

type AttendanceEntry = {
  studentId: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
};

type SubmitAttendanceInput = {
  classSessionId: string;
  educatorId: string;
  submittedAt: Date;
  attendanceEntries: AttendanceEntry[];
};

type SubmitAttendanceResult = {
  attendanceRecords: {
    id: string;
    studentId: string;
    status: string;
    submittedById: string;
    submittedAt: Date;
  }[];
  educatorAttendance: {
    id: string;
    educatorId: string;
    classSessionId: string;
    submittedAttendanceAt: Date;
  };
};

export async function isAttendanceLocked(classSessionId: string, now: Date = new Date()): Promise<boolean> {
  const settings = await prisma.systemSettings.findFirstOrThrow();
  const windowDays = settings.attendanceCorrectionWindowDays;

  const records = await prisma.attendanceRecord.findMany({
    where: { classSessionId },
    select: { id: true, submittedAt: true, lockedAt: true },
  });

  if (records.length === 0) return false;

  const lockThreshold = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const lockedRecords = records.filter((r) => r.submittedAt < lockThreshold);

  if (lockedRecords.length > 0) {
    await prisma.attendanceRecord.updateMany({
      where: { id: { in: lockedRecords.map((r) => r.id) }, lockedAt: null },
      data: { lockedAt: new Date(lockThreshold.getTime()) },
    });
  }

  return lockedRecords.length > 0;
}

export async function submitAttendance(input: SubmitAttendanceInput): Promise<SubmitAttendanceResult> {
  const educator = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.educatorId } });
  if (educator.role !== "EDUCATOR") {
    throw new Error("Only an Educator can submit attendance");
  }

  const session = await prisma.classSession.findUniqueOrThrow({
    where: { id: input.classSessionId },
    include: { moduleOffering: true },
  });

  const courseOffering = await prisma.courseOffering.findUniqueOrThrow({
    where: { id: session.moduleOffering.courseOfferingId },
  });
  const inMarkingWindow = courseOffering.status === "ARCHIVED" && await isInMarkingWindow(courseOffering.id, input.submittedAt);
  if (courseOffering.status === "ARCHIVED" && !inMarkingWindow) {
    throw new Error("Course Offering is archived and read-only");
  }

  if (!inMarkingWindow && await isAttendanceLocked(input.classSessionId, input.submittedAt)) {
    throw new Error("Attendance is locked for this Class Session");
  }

  const existingRecords = await prisma.attendanceRecord.findMany({
    where: { classSessionId: input.classSessionId },
    select: { id: true },
  });

  if (existingRecords.length === 0) {
    if (input.submittedAt < session.startAt || input.submittedAt > session.finishAt) {
      throw new Error("SubmittedAt must be within the session time period");
    }
  }

  const attendanceRecords = await Promise.all(
    input.attendanceEntries.map((entry) =>
      prisma.attendanceRecord.upsert({
        where: {
          classSessionId_studentId: {
            classSessionId: input.classSessionId,
            studentId: entry.studentId,
          },
        },
        create: {
          classSessionId: input.classSessionId,
          studentId: entry.studentId,
          status: entry.status,
          submittedById: input.educatorId,
          submittedAt: input.submittedAt,
        },
        update: {
          status: entry.status,
          submittedAt: input.submittedAt,
        },
      })
    )
  );

  const educatorAttendance = await prisma.educatorAttendanceRecord.upsert({
    where: { classSessionId: input.classSessionId },
    create: {
      classSessionId: input.classSessionId,
      educatorId: input.educatorId,
      submittedAttendanceAt: input.submittedAt,
    },
    update: {
      submittedAttendanceAt: input.submittedAt,
    },
  });

  return {
    attendanceRecords: attendanceRecords.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      status: r.status,
      submittedById: r.submittedById,
      submittedAt: r.submittedAt,
    })),
    educatorAttendance: {
      id: educatorAttendance.id,
      educatorId: educatorAttendance.educatorId,
      classSessionId: educatorAttendance.classSessionId,
      submittedAttendanceAt: educatorAttendance.submittedAttendanceAt,
    },
  };
}

type GetAttendanceForSessionResult = {
  session: {
    id: string;
    startAt: Date;
    finishAt: Date;
    attendanceRequired: boolean;
  };
  records: {
    id: string;
    studentId: string;
    studentIdentifier: string;
    studentName: string;
    status: string;
    submittedAt: Date;
    lockedAt: Date | null;
  }[];
  educatorSubmitted: boolean;
};

export async function getStudentAttendancePercentage(studentId: string, moduleOfferingId: string): Promise<number | null> {
  const records = await prisma.attendanceRecord.findMany({
    where: {
      studentId,
      classSession: { moduleOfferingId },
    },
    select: { status: true },
  });

  if (records.length === 0) return null;

  let attended = 0;
  let countable = 0;

  for (const record of records) {
    if (record.status === "EXCUSED") continue;
    countable++;
    if (record.status === "PRESENT" || record.status === "LATE") {
      attended++;
    }
  }

  if (countable === 0) return null;

  return Math.round((attended / countable) * 100);
}

export async function getAttendanceForSession(classSessionId: string): Promise<GetAttendanceForSessionResult> {
  const session = await prisma.classSession.findUniqueOrThrow({
    where: { id: classSessionId },
    select: {
      id: true,
      startAt: true,
      finishAt: true,
      attendanceRequired: true,
    },
  });

  const records = await prisma.attendanceRecord.findMany({
    where: { classSessionId },
    select: {
      id: true,
      studentId: true,
      student: {
        select: {
          generatedIdentifier: true,
          user: { select: { name: true } },
        },
      },
      status: true,
      submittedAt: true,
      lockedAt: true,
    },
  });

  const educatorAttendance = await prisma.educatorAttendanceRecord.findUnique({
    where: { classSessionId },
  });

  return {
    session,
    records: records.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentIdentifier: r.student.generatedIdentifier,
      studentName: r.student.user.name,
      status: r.status,
      submittedAt: r.submittedAt,
      lockedAt: r.lockedAt,
    })),
    educatorSubmitted: !!educatorAttendance,
  };
}

type RequestCorrectionInput = {
  attendanceRecordId: string;
  educatorId: string;
  requestedStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  reason: string;
};

type RequestCorrectionResult = {
  id: string;
  attendanceRecordId: string;
  requestedById: string;
  requestedStatus: string;
  reason: string;
  status: string;
};

export async function requestCorrection(input: RequestCorrectionInput): Promise<RequestCorrectionResult> {
  const educator = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.educatorId } });
  if (educator.role !== "EDUCATOR") {
    throw new Error("Only an Educator can request a correction");
  }

  const record = await prisma.attendanceRecord.findUniqueOrThrow({
    where: { id: input.attendanceRecordId },
  });

  if (!record.lockedAt) {
    throw new Error("Attendance must be locked before requesting a correction");
  }

  const correction = await prisma.attendanceCorrectionRequest.create({
    data: {
      attendanceRecordId: input.attendanceRecordId,
      requestedById: input.educatorId,
      requestedStatus: input.requestedStatus,
      reason: input.reason,
    },
  });

  return {
    id: correction.id,
    attendanceRecordId: correction.attendanceRecordId,
    requestedById: correction.requestedById,
    requestedStatus: correction.requestedStatus,
    reason: correction.reason,
    status: correction.status,
  };
}

type ResolveCorrectionInput = {
  correctionRequestId: string;
  resolverId: string;
  action: "APPROVE" | "REJECT";
};

type ResolveCorrectionResult = {
  id: string;
  status: string;
};

export async function resolveCorrection(input: ResolveCorrectionInput): Promise<ResolveCorrectionResult> {
  const resolver = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.resolverId } });
  if (resolver.role !== "ADMINISTRATOR" && resolver.role !== "SUPER_ADMINISTRATOR") {
    throw new Error("Only an Administrator can resolve a correction request");
  }

  const correction = await prisma.attendanceCorrectionRequest.findUniqueOrThrow({
    where: { id: input.correctionRequestId },
    include: { attendanceRecord: true },
  });

  if (correction.status !== "PENDING") {
    throw new Error("Correction request already resolved");
  }

  const now = new Date();

  if (input.action === "APPROVE") {
    await prisma.$transaction([
      prisma.attendanceRecord.update({
        where: { id: correction.attendanceRecordId },
        data: { status: correction.requestedStatus },
      }),
      prisma.attendanceCorrectionRequest.update({
        where: { id: correction.id },
        data: {
          status: "APPROVED",
          resolvedById: input.resolverId,
          resolvedAt: now,
        },
      }),
      prisma.auditLogEntry.create({
        data: {
          eventType: "OPERATIONAL",
          action: "CORRECTION_APPROVED",
          actorId: input.resolverId,
          entityType: "AttendanceRecord",
          entityId: correction.attendanceRecordId,
          beforeJson: JSON.stringify({ status: correction.attendanceRecord.status }),
          afterJson: JSON.stringify({ status: correction.requestedStatus }),
          reason: correction.reason,
        },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.attendanceCorrectionRequest.update({
        where: { id: correction.id },
        data: {
          status: "REJECTED",
          resolvedById: input.resolverId,
          resolvedAt: now,
        },
      }),
      prisma.auditLogEntry.create({
        data: {
          eventType: "OPERATIONAL",
          action: "CORRECTION_REJECTED",
          actorId: input.resolverId,
          entityType: "AttendanceCorrectionRequest",
          entityId: correction.id,
          reason: correction.reason,
        },
      }),
    ]);
  }

  return {
    id: correction.id,
    status: input.action === "APPROVE" ? "APPROVED" : "REJECTED",
  };
}

type AdminOverrideInput = {
  attendanceRecordId: string;
  newStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  reason: string;
  overriddenById: string;
};

type AdminOverrideResult = {
  id: string;
  status: string;
  overriddenById: string;
  overriddenAt: Date;
};

export async function adminOverrideAttendance(input: AdminOverrideInput): Promise<AdminOverrideResult> {
  const overrideUser = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.overriddenById } });
  if (overrideUser.role !== "ADMINISTRATOR" && overrideUser.role !== "SUPER_ADMINISTRATOR") {
    throw new Error("Only an Administrator can override attendance");
  }

  const record = await prisma.attendanceRecord.findUniqueOrThrow({
    where: { id: input.attendanceRecordId },
  });

  const now = new Date();

  const [updated] = await prisma.$transaction([
    prisma.attendanceRecord.update({
      where: { id: input.attendanceRecordId },
      data: { status: input.newStatus },
    }),
    prisma.auditLogEntry.create({
      data: {
        eventType: "OPERATIONAL",
        action: "ADMIN_OVERRIDE",
        actorId: input.overriddenById,
        entityType: "AttendanceRecord",
        entityId: input.attendanceRecordId,
        beforeJson: JSON.stringify({ status: record.status }),
        afterJson: JSON.stringify({ status: input.newStatus }),
        reason: input.reason,
      },
    }),
  ]);

  return {
    id: updated.id,
    status: updated.status,
    overriddenById: input.overriddenById,
    overriddenAt: now,
  };
}

type AdminOverrideSessionInput = {
  classSessionId: string;
  entries: { attendanceRecordId: string; newStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" }[];
  reason: string;
  overriddenById: string;
};

type AdminOverrideSessionResult = {
  overrides: {
    id: string;
    status: string;
    overriddenById: string;
    overriddenAt: Date;
  }[];
};

export async function adminOverrideSessionAttendance(input: AdminOverrideSessionInput): Promise<AdminOverrideSessionResult> {
  const overrideUser = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.overriddenById } });
  if (overrideUser.role !== "ADMINISTRATOR" && overrideUser.role !== "SUPER_ADMINISTRATOR") {
    throw new Error("Only an Administrator can override attendance");
  }

  const records = await prisma.attendanceRecord.findMany({
    where: { id: { in: input.entries.map((e) => e.attendanceRecordId) } },
  });
  const recordMap = new Map(records.map((r) => [r.id, r]));

  const now = new Date();

  const overrides: { id: string; status: string; overriddenById: string; overriddenAt: Date }[] = [];

  await prisma.$transaction(async (tx) => {
    for (const entry of input.entries) {
      const record = recordMap.get(entry.attendanceRecordId);
      if (!record) continue;

      await tx.attendanceRecord.update({
        where: { id: entry.attendanceRecordId },
        data: { status: entry.newStatus },
      });

      await tx.auditLogEntry.create({
        data: {
          eventType: "OPERATIONAL",
          action: "ADMIN_OVERRIDE",
          actorId: input.overriddenById,
          entityType: "AttendanceRecord",
          entityId: entry.attendanceRecordId,
          beforeJson: JSON.stringify({ status: record.status }),
          afterJson: JSON.stringify({ status: entry.newStatus }),
          reason: input.reason,
        },
      });

      overrides.push({
        id: entry.attendanceRecordId,
        status: entry.newStatus,
        overriddenById: input.overriddenById,
        overriddenAt: now,
      });
    }
  });

  return { overrides };
}

type ExportAttendanceCSVInput = {
  moduleOfferingId: string;
  requestedById: string;
};

export async function exportAttendanceCSV(input: ExportAttendanceCSVInput): Promise<string> {
  const requester = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.requestedById } });
  if (requester.role !== "EDUCATOR" && requester.role !== "ADMINISTRATOR" && requester.role !== "SUPER_ADMINISTRATOR") {
    throw new Error("Only an Educator or Administrator can export attendance CSV");
  }

  const sessions = await prisma.classSession.findMany({
    where: { moduleOfferingId: input.moduleOfferingId },
    orderBy: { startAt: "asc" },
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

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: { classSession: { moduleOfferingId: input.moduleOfferingId } },
  });

  const recordsByStudentAndSession = new Map<string, Map<string, string>>();
  for (const record of attendanceRecords) {
    if (!recordsByStudentAndSession.has(record.studentId)) {
      recordsByStudentAndSession.set(record.studentId, new Map());
    }
    recordsByStudentAndSession.get(record.studentId)!.set(record.classSessionId, record.status);
  }

  const sessionHeaders = sessions.map((s) => `"${s.startAt.toISOString().split("T")[0]}"`).join(",");
  const header = `"Student Identifier","Name",${sessionHeaders},"Present","Absent","Late","Excused","Attendance (%)"`;

  const rows: string[] = [header];

  for (const enrollment of enrollments) {
    const effective = calculateEffectiveModuleAccess(allModuleOfferings, enrollment.moduleEnrollmentExceptions);
    if (!effective.some((mo) => mo.id === input.moduleOfferingId)) continue;

    const student = enrollment.student;
    const identifier = student.generatedIdentifier;
    const name = `"${student.user.name}"`;

    const sessionStatuses = sessions.map((s) => {
      const status = recordsByStudentAndSession.get(student.id)?.get(s.id);
      return status ?? "";
    });

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    for (const status of sessionStatuses) {
      if (status === "PRESENT") present++;
      else if (status === "ABSENT") absent++;
      else if (status === "LATE") late++;
      else if (status === "EXCUSED") excused++;
    }

    const countable = present + absent + late;
    const percentage = countable > 0 ? Math.round(((present + late) / countable) * 100) : "";

    rows.push(`"${identifier}",${name},${sessionStatuses.join(",")},${present},${absent},${late},${excused},${percentage}`);
  }

  return rows.join("\n");
}
