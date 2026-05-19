import { prisma } from "@/lib/prisma";

export async function getStudentDashboard(studentId: string) {
  const [enrolments, attendance, dueAssignments, marks, notifications] =
    await Promise.all([
      prisma.enrolment.findMany({
        where: { studentId, status: "ACTIVE" },
        include: {
          courseOffering: {
            include: {
              course: true,
              moduleOfferings: {
                include: {
                  templateModule: { include: { module: true, academicLevel: true } },
                },
              },
            },
          },
        },
      }),
      prisma.attendanceRecord.findMany({
        where: { studentId },
        include: {
          classSession: {
            include: {
              moduleOffering: {
                include: { templateModule: { include: { module: true } } },
              },
            },
          },
        },
        take: 50,
        orderBy: { submittedAt: "desc" },
      }),
      prisma.assignment.findMany({
        where: {
          status: "PUBLISHED",
          deadlineAt: { gte: new Date() },
          moduleOffering: {
            courseOffering: {
              enrolments: { some: { studentId, status: "ACTIVE" } },
            },
          },
        },
        include: {
          moduleOffering: {
            include: { templateModule: { include: { module: true } } },
          },
        },
        orderBy: { deadlineAt: "asc" },
        take: 8,
      }),
      prisma.componentMark.findMany({
        where: { studentId, status: "RELEASED" },
        include: { assessmentComponent: { include: { moduleOffering: true } } },
        orderBy: { releasedAt: "desc" },
        take: 6,
      }),
      prisma.notification.findMany({
        where: {
          recipient: { studentProfile: { id: studentId } },
          readAt: null,
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  const counted = attendance.filter((record) => record.status !== "EXCUSED");
  const attended = counted.filter(
    (record) => record.status === "PRESENT" || record.status === "LATE",
  );
  const attendancePercentage =
    counted.length === 0 ? null : Math.round((attended.length / counted.length) * 100);

  return {
    enrolments,
    attendancePercentage,
    dueAssignments,
    marks,
    notifications,
  };
}

export async function getEducatorDashboard(educatorId: string) {
  const [moduleOfferings, pendingSubmissions, mentions, attendanceSessions] =
    await Promise.all([
      prisma.moduleOffering.findMany({
        where: { primaryEducatorId: educatorId, status: "ACTIVE" },
        include: {
          courseOffering: { include: { course: true } },
          templateModule: { include: { module: true, academicLevel: true } },
        },
        orderBy: { startsAt: "asc" },
      }),
      prisma.submission.count({
        where: {
          status: { in: ["SUBMITTED", "LATE"] },
          assignment: {
            moduleOffering: { primaryEducatorId: educatorId },
          },
        },
      }),
      prisma.notification.findMany({
        where: {
          recipient: { educatorProfile: { id: educatorId } },
          type: "MENTION",
          readAt: null,
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.classSession.findMany({
        where: {
          moduleOffering: { primaryEducatorId: educatorId },
          startsAt: { gte: new Date() },
        },
        include: {
          moduleOffering: { include: { templateModule: { include: { module: true } } } },
        },
        orderBy: { startsAt: "asc" },
        take: 8,
      }),
    ]);

  return { moduleOfferings, pendingSubmissions, mentions, attendanceSessions };
}

export async function getAdminDashboard() {
  const [
    activeCourseOfferings,
    students,
    educators,
    pendingCorrections,
    operationalAuditEvents,
  ] = await Promise.all([
    prisma.courseOffering.count({ where: { status: "ACTIVE" } }),
    prisma.studentProfile.count(),
    prisma.educatorProfile.count(),
    prisma.attendanceCorrectionRequest.count({ where: { status: "PENDING" } }),
    prisma.auditLogEntry.findMany({
      where: { eventType: "OPERATIONAL" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return {
    activeCourseOfferings,
    students,
    educators,
    pendingCorrections,
    operationalAuditEvents,
  };
}

export async function getSuperAdminDashboard() {
  const [admins, settings, systemAuditEvents, userAccounts] = await Promise.all([
    prisma.administratorProfile.count(),
    prisma.systemSetting.findMany({ orderBy: { key: "asc" } }),
    prisma.auditLogEntry.findMany({
      where: { eventType: "SYSTEM" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.userAccount.count(),
  ]);

  return { admins, settings, systemAuditEvents, userAccounts };
}
