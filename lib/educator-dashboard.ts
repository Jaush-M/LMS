import { prisma } from "./prisma";
import { calculateEffectiveModuleAccess } from "./enrollment";
import { getStudentAttendancePercentage } from "./attendance";

// ── types ─────────────────────────────────────────────────────────────────────

export type AssignedModuleOffering = {
  id: string;
  moduleName: string;
  courseOfferingId: string;
  courseOfferingName: string;
};

export type PendingMarkingItem = {
  submissionId: string;
  assignmentId: string;
  assignmentTitle: string;
  moduleOfferingId: string;
  moduleName: string;
  studentId: string;
  studentName: string;
  submittedAt: Date;
};

export type UpcomingClassSession = {
  id: string;
  moduleOfferingId: string;
  moduleName: string;
  startAt: Date;
  finishAt: Date;
  sessionTypeName: string;
  sessionLocation: string | null;
};

export type UnsubmittedAttendanceSession = {
  id: string;
  moduleOfferingId: string;
  moduleName: string;
  startAt: Date;
  finishAt: Date;
};

export type UnreadMention = {
  notificationId: string;
  chatMessageId: string;
  moduleOfferingId: string;
  moduleName: string;
  createdAt: Date;
};

export type AtRiskReason =
  | { kind: "LOW_ATTENDANCE"; attendancePercentage: number }
  | { kind: "OVERDUE_ASSIGNMENT"; assignmentId: string; assignmentTitle: string }
  | { kind: "FAILED_FINAL_GRADE"; percentage: number };

export type AtRiskStudent = {
  studentId: string;
  studentName: string;
  moduleOfferingId: string;
  moduleName: string;
  reasons: AtRiskReason[];
};

export type EducatorDashboardData = {
  assignedModuleOfferings: AssignedModuleOffering[];
  pendingMarking: PendingMarkingItem[];
  upcomingClassSessions: UpcomingClassSession[];
  unsubmittedAttendanceSessions: UnsubmittedAttendanceSession[];
  unreadMentions: UnreadMention[];
  atRiskStudents: AtRiskStudent[];
};

// ── getEducatorDashboard ──────────────────────────────────────────────────────

export async function getEducatorDashboard(educatorId: string, now: Date = new Date()): Promise<EducatorDashboardData> {
  const settings = await prisma.systemSettings.findFirstOrThrow();

  // Get all module offerings assigned to this educator
  const moduleOfferingsRaw = await prisma.moduleOffering.findMany({
    where: { primaryEducatorId: educatorId },
    include: {
      templateModule: { include: { module: { select: { name: true } } } },
      courseOffering: { select: { id: true, name: true } },
    },
  });

  if (moduleOfferingsRaw.length === 0) {
    return {
      assignedModuleOfferings: [],
      pendingMarking: [],
      upcomingClassSessions: [],
      unsubmittedAttendanceSessions: [],
      unreadMentions: [],
      atRiskStudents: [],
    };
  }

  const moduleOfferingIds = moduleOfferingsRaw.map((mo) => mo.id);
  const moduleNameById = new Map(moduleOfferingsRaw.map((mo) => [mo.id, mo.templateModule.module.name]));

  // ── assigned module offerings ──────────────────────────────────────────────

  const assignedModuleOfferings: AssignedModuleOffering[] = moduleOfferingsRaw.map((mo) => ({
    id: mo.id,
    moduleName: mo.templateModule.module.name,
    courseOfferingId: mo.courseOffering.id,
    courseOfferingName: mo.courseOffering.name,
  }));

  // ── pending marking ────────────────────────────────────────────────────────

  const assignmentsRaw = await prisma.assignment.findMany({
    where: { moduleOfferingId: { in: moduleOfferingIds } },
    select: { id: true, title: true, moduleOfferingId: true },
  });

  const submissionsRaw = await prisma.assignmentSubmission.findMany({
    where: {
      assignmentId: { in: assignmentsRaw.map((a) => a.id) },
      status: { in: ["SUBMITTED", "LATE"] },
    },
    include: { student: { select: { id: true, user: { select: { name: true } } } } },
    orderBy: { submittedAt: "asc" },
  });

  const assignmentTitleById = new Map(assignmentsRaw.map((a) => [a.id, a.title]));
  const assignmentModuleById = new Map(assignmentsRaw.map((a) => [a.id, a.moduleOfferingId]));

  const pendingMarking: PendingMarkingItem[] = submissionsRaw.map((s) => ({
    submissionId: s.id,
    assignmentId: s.assignmentId,
    assignmentTitle: assignmentTitleById.get(s.assignmentId) ?? "",
    moduleOfferingId: assignmentModuleById.get(s.assignmentId) ?? "",
    moduleName: moduleNameById.get(assignmentModuleById.get(s.assignmentId) ?? "") ?? "",
    studentId: s.studentId,
    studentName: s.student.user.name,
    submittedAt: s.submittedAt,
  }));

  // ── upcoming class sessions ────────────────────────────────────────────────

  const upcomingSessionsRaw = await prisma.classSession.findMany({
    where: { moduleOfferingId: { in: moduleOfferingIds }, startAt: { gt: now } },
    include: { sessionType: { select: { name: true } } },
    orderBy: { startAt: "asc" },
  });

  const upcomingClassSessions: UpcomingClassSession[] = upcomingSessionsRaw.map((s) => ({
    id: s.id,
    moduleOfferingId: s.moduleOfferingId,
    moduleName: moduleNameById.get(s.moduleOfferingId) ?? "",
    startAt: s.startAt,
    finishAt: s.finishAt,
    sessionTypeName: s.sessionType.name,
    sessionLocation: s.sessionLocation,
  }));

  // ── unsubmitted attendance sessions ───────────────────────────────────────

  const pastRequiredSessions = await prisma.classSession.findMany({
    where: { moduleOfferingId: { in: moduleOfferingIds }, startAt: { lte: now }, attendanceRequired: true },
    select: { id: true, moduleOfferingId: true, startAt: true, finishAt: true, educatorAttendance: { select: { id: true } } },
  });

  const unsubmittedAttendanceSessions: UnsubmittedAttendanceSession[] = pastRequiredSessions
    .filter((s) => !s.educatorAttendance)
    .map((s) => ({
      id: s.id,
      moduleOfferingId: s.moduleOfferingId,
      moduleName: moduleNameById.get(s.moduleOfferingId) ?? "",
      startAt: s.startAt,
      finishAt: s.finishAt,
    }));

  // ── unread @mentions ──────────────────────────────────────────────────────

  const chatIds = await prisma.moduleGroupChat.findMany({
    where: { moduleOfferingId: { in: moduleOfferingIds } },
    select: { id: true, moduleOfferingId: true },
  });
  const chatModuleMap = new Map(chatIds.map((c) => [c.id, c.moduleOfferingId]));

  const mentionNotifications = await prisma.notification.findMany({
    where: {
      recipientId: educatorId,
      sourceType: "CHAT_MENTION",
      readAt: null,
      chatMessage: { chatId: { in: chatIds.map((c) => c.id) } },
    },
    include: { chatMessage: { select: { chatId: true } } },
    orderBy: { createdAt: "desc" },
  });

  const unreadMentions: UnreadMention[] = mentionNotifications
    .filter((n) => n.chatMessageId !== null && n.chatMessage !== null)
    .map((n) => {
      const moduleOfferingId = chatModuleMap.get(n.chatMessage!.chatId) ?? "";
      return {
        notificationId: n.id,
        chatMessageId: n.chatMessageId!,
        moduleOfferingId,
        moduleName: moduleNameById.get(moduleOfferingId) ?? "",
        createdAt: n.createdAt,
      };
    });

  // ── at-risk students ──────────────────────────────────────────────────────

  const courseOfferingIds = [...new Set(moduleOfferingsRaw.map((mo) => mo.courseOffering.id))];

  const enrollments = await prisma.enrollment.findMany({
    where: { courseOfferingId: { in: courseOfferingIds }, status: "ACTIVE" },
    select: {
      studentId: true,
      courseOfferingId: true,
      moduleEnrollmentExceptions: { select: { moduleOfferingId: true, exceptionType: true } },
    },
  });

  const studentIds = [...new Set(enrollments.map((e) => e.studentId))];
  const studentsRaw = await prisma.userAccount.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, user: { select: { name: true } } },
  });
  const studentNameById = new Map(studentsRaw.map((s) => [s.id, s.user.name]));

  // For each course offering, compute effective module access per enrollment
  const studentModulePairs: { studentId: string; moduleOfferingId: string }[] = [];

  for (const enrollment of enrollments) {
    const defaultMOs = moduleOfferingsRaw
      .filter((mo) => mo.courseOfferingId === enrollment.courseOfferingId)
      .map((mo) => ({ id: mo.id }));

    const effective = calculateEffectiveModuleAccess(defaultMOs, enrollment.moduleEnrollmentExceptions);

    for (const mo of effective) {
      if (moduleOfferingIds.includes(mo.id)) {
        studentModulePairs.push({ studentId: enrollment.studentId, moduleOfferingId: mo.id });
      }
    }
  }

  // Deduplicate pairs
  const seenPairs = new Set<string>();
  const uniquePairs = studentModulePairs.filter((p) => {
    const key = `${p.studentId}:${p.moduleOfferingId}`;
    if (seenPairs.has(key)) return false;
    seenPairs.add(key);
    return true;
  });

  // Fetch overdue assignments (past deadline, published)
  const overdueAssignments = await prisma.assignment.findMany({
    where: { moduleOfferingId: { in: moduleOfferingIds }, status: "PUBLISHED", deadline: { lt: now } },
    select: { id: true, title: true, moduleOfferingId: true },
  });

  // Fetch all submissions for these overdue assignments and at-risk students
  const overdueSubmissions = await prisma.assignmentSubmission.findMany({
    where: {
      assignmentId: { in: overdueAssignments.map((a) => a.id) },
      studentId: { in: studentIds },
    },
    select: { assignmentId: true, studentId: true },
  });
  const submittedSet = new Set(overdueSubmissions.map((s) => `${s.assignmentId}:${s.studentId}`));

  // Fetch released failing final grades
  const failingFinalGrades = await prisma.finalGrade.findMany({
    where: { moduleOfferingId: { in: moduleOfferingIds }, studentId: { in: studentIds }, status: "RELEASED", isPassing: false },
    select: { studentId: true, moduleOfferingId: true, percentage: true },
  });
  const failingFinalGradeMap = new Map(failingFinalGrades.map((fg) => [`${fg.studentId}:${fg.moduleOfferingId}`, fg.percentage]));

  const atRiskMap = new Map<string, AtRiskStudent>();

  for (const { studentId, moduleOfferingId } of uniquePairs) {
    const reasons: AtRiskReason[] = [];

    // Low attendance
    const pct = await getStudentAttendancePercentage(studentId, moduleOfferingId);
    if (pct !== null && pct < settings.attendanceRiskThresholdPercent) {
      reasons.push({ kind: "LOW_ATTENDANCE", attendancePercentage: pct });
    }

    // Overdue assignments without submission
    for (const assignment of overdueAssignments.filter((a) => a.moduleOfferingId === moduleOfferingId)) {
      if (!submittedSet.has(`${assignment.id}:${studentId}`)) {
        reasons.push({ kind: "OVERDUE_ASSIGNMENT", assignmentId: assignment.id, assignmentTitle: assignment.title });
      }
    }

    // Released final grade below pass threshold
    const failPct = failingFinalGradeMap.get(`${studentId}:${moduleOfferingId}`);
    if (failPct !== undefined) {
      reasons.push({ kind: "FAILED_FINAL_GRADE", percentage: failPct });
    }

    if (reasons.length > 0) {
      const key = `${studentId}:${moduleOfferingId}`;
      atRiskMap.set(key, {
        studentId,
        studentName: studentNameById.get(studentId) ?? "",
        moduleOfferingId,
        moduleName: moduleNameById.get(moduleOfferingId) ?? "",
        reasons,
      });
    }
  }

  const atRiskStudents = Array.from(atRiskMap.values());

  return {
    assignedModuleOfferings,
    pendingMarking,
    upcomingClassSessions,
    unsubmittedAttendanceSessions,
    unreadMentions,
    atRiskStudents,
  };
}
