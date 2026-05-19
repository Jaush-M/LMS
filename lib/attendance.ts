import { prisma } from "./prisma";

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

  if (await isAttendanceLocked(input.classSessionId, input.submittedAt)) {
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
    await prisma.attendanceCorrectionRequest.update({
      where: { id: correction.id },
      data: {
        status: "REJECTED",
        resolvedById: input.resolverId,
        resolvedAt: now,
      },
    });
  }

  return {
    id: correction.id,
    status: input.action === "APPROVE" ? "APPROVED" : "REJECTED",
  };
}
