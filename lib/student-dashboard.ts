import { prisma } from "./prisma";
import { calculateEffectiveModuleAccess } from "./enrollment";
import { getStudentAttendancePercentage } from "./attendance";
import { hasUnreadChatActivity } from "./group-chat";
import { getCalendarFeed, type CalendarFeedItem } from "./academic-calendar";

// ── types ─────────────────────────────────────────────────────────────────────

export type DueAssignment = {
  id: string;
  title: string;
  deadline: Date;
  moduleOfferingId: string;
  moduleName: string;
  submissionStatus: "NOT_SUBMITTED" | "SUBMITTED" | "LATE" | "MARKED";
};

export type ModuleAttendance = {
  moduleOfferingId: string;
  moduleName: string;
  percentage: number | null;
};

export type ReleasedComponentMark = {
  id: string;
  assessmentComponentTitle: string;
  moduleOfferingId: string;
  moduleName: string;
  score: number;
  maximumMark: number;
};

export type ReleasedFinalGrade = {
  moduleOfferingId: string;
  moduleName: string;
  percentage: number;
  isPassing: boolean;
};

export type ModuleChatActivity = {
  chatId: string;
  moduleOfferingId: string;
  moduleName: string;
  hasUnread: boolean;
};

export type CourseProgress = {
  courseOfferingId: string;
  academicLevelId: string;
  academicLevelLabel: string;
  completedModules: number;
  totalModules: number;
};

export type AttentionItemKind = "LOW_ATTENDANCE" | "OVERDUE_ASSIGNMENT" | "FAILED_FINAL_GRADE" | "UPCOMING_DEADLINE";

export type AttentionItem = {
  kind: AttentionItemKind;
  message: string;
  moduleOfferingId?: string;
  assignmentId?: string;
};

export type StudentDashboardData = {
  dueAssignments: DueAssignment[];
  attendanceByModuleOffering: ModuleAttendance[];
  releasedMarks: ReleasedComponentMark[];
  releasedFinalGrades: ReleasedFinalGrade[];
  chatActivity: ModuleChatActivity[];
  upcomingCalendarEvents: CalendarFeedItem[];
  courseProgress: CourseProgress[];
  attentionItems: AttentionItem[];
};

// ── getStudentDashboard ───────────────────────────────────────────────────────

export async function getStudentDashboard(studentId: string, now: Date = new Date()): Promise<StudentDashboardData> {
  const [settings, student] = await Promise.all([
    prisma.systemSettings.findFirstOrThrow(),
    prisma.userAccount.findUniqueOrThrow({ where: { id: studentId } }),
  ]);

  const reminderPeriodDays = student.reminderPeriodDays ?? settings.defaultReminderPeriodDays;

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId, status: "ACTIVE" },
    select: {
      id: true,
      courseOfferingId: true,
      moduleEnrollmentExceptions: { select: { moduleOfferingId: true, exceptionType: true } },
    },
  });

  if (enrollments.length === 0) {
    return {
      dueAssignments: [],
      attendanceByModuleOffering: [],
      releasedMarks: [],
      releasedFinalGrades: [],
      chatActivity: [],
      upcomingCalendarEvents: [],
      courseProgress: [],
      attentionItems: [],
    };
  }

  // Compute effective module offering IDs across all enrollments
  const effectiveModuleOfferingIds: string[] = [];
  for (const enrollment of enrollments) {
    const defaultModuleOfferings = await prisma.moduleOffering.findMany({
      where: { courseOfferingId: enrollment.courseOfferingId },
      select: { id: true },
    });
    const effective = calculateEffectiveModuleAccess(defaultModuleOfferings, enrollment.moduleEnrollmentExceptions);
    effectiveModuleOfferingIds.push(...effective.map((mo) => mo.id));
  }
  const uniqueModuleOfferingIds = [...new Set(effectiveModuleOfferingIds)];

  // Load module offerings with their template module (name) and academic level
  const moduleOfferingsData = await prisma.moduleOffering.findMany({
    where: { id: { in: uniqueModuleOfferingIds } },
    include: {
      templateModule: {
        include: {
          module: { select: { name: true } },
          academicLevel: { select: { id: true, label: true } },
        },
      },
      moduleGroupChat: { select: { id: true } },
    },
  });

  const moduleNameById = new Map(moduleOfferingsData.map((mo) => [mo.id, mo.templateModule.module.name]));

  // ── due assignments ────────────────────────────────────────────────────────

  const assignmentsRaw = await prisma.assignment.findMany({
    where: { moduleOfferingId: { in: uniqueModuleOfferingIds }, status: "PUBLISHED" },
    orderBy: { deadline: "asc" },
  });

  const submissionsRaw = await prisma.assignmentSubmission.findMany({
    where: { assignmentId: { in: assignmentsRaw.map((a) => a.id) }, studentId },
  });
  const submissionByAssignmentId = new Map(submissionsRaw.map((s) => [s.assignmentId, s]));

  const dueAssignments: DueAssignment[] = assignmentsRaw.map((a) => {
    const submission = submissionByAssignmentId.get(a.id);
    let submissionStatus: DueAssignment["submissionStatus"] = "NOT_SUBMITTED";
    if (submission) {
      if (submission.status === "MARKED") submissionStatus = "MARKED";
      else if (submission.status === "LATE") submissionStatus = "LATE";
      else submissionStatus = "SUBMITTED";
    }
    return {
      id: a.id,
      title: a.title,
      deadline: a.deadline,
      moduleOfferingId: a.moduleOfferingId,
      moduleName: moduleNameById.get(a.moduleOfferingId) ?? "",
      submissionStatus,
    };
  });

  // ── attendance percentage per module offering ──────────────────────────────

  const attendanceByModuleOffering: ModuleAttendance[] = await Promise.all(
    uniqueModuleOfferingIds.map(async (moId) => ({
      moduleOfferingId: moId,
      moduleName: moduleNameById.get(moId) ?? "",
      percentage: await getStudentAttendancePercentage(studentId, moId),
    }))
  );

  // ── released component marks ───────────────────────────────────────────────

  const releasedMarksRaw = await prisma.componentMark.findMany({
    where: {
      studentId,
      status: "RELEASED",
      assessmentComponent: { moduleOfferingId: { in: uniqueModuleOfferingIds } },
    },
    include: { assessmentComponent: { select: { title: true, maximumMark: true, moduleOfferingId: true } } },
    orderBy: { createdAt: "desc" },
  });

  const releasedMarks: ReleasedComponentMark[] = releasedMarksRaw.map((m) => ({
    id: m.id,
    assessmentComponentTitle: m.assessmentComponent.title,
    moduleOfferingId: m.assessmentComponent.moduleOfferingId,
    moduleName: moduleNameById.get(m.assessmentComponent.moduleOfferingId) ?? "",
    score: m.score,
    maximumMark: m.assessmentComponent.maximumMark,
  }));

  // ── released final grades ──────────────────────────────────────────────────

  const releasedFinalGradesRaw = await prisma.finalGrade.findMany({
    where: { studentId, status: "RELEASED", moduleOfferingId: { in: uniqueModuleOfferingIds } },
  });

  const releasedFinalGrades: ReleasedFinalGrade[] = releasedFinalGradesRaw.map((fg) => ({
    moduleOfferingId: fg.moduleOfferingId,
    moduleName: moduleNameById.get(fg.moduleOfferingId) ?? "",
    percentage: fg.percentage,
    isPassing: fg.isPassing,
  }));

  // ── unread chat activity ───────────────────────────────────────────────────

  const chatActivity: ModuleChatActivity[] = [];
  for (const mo of moduleOfferingsData) {
    if (!mo.moduleGroupChat) continue;
    const hasUnread = await hasUnreadChatActivity({ chatId: mo.moduleGroupChat.id, userId: studentId });
    chatActivity.push({
      chatId: mo.moduleGroupChat.id,
      moduleOfferingId: mo.id,
      moduleName: mo.templateModule.module.name,
      hasUnread,
    });
  }

  // ── upcoming calendar events ───────────────────────────────────────────────

  const allCalendarEvents = await getCalendarFeed(studentId);
  const upcomingCalendarEvents = allCalendarEvents.filter((e) => e.startAt >= now);

  // ── course progress by academic level ─────────────────────────────────────

  const courseProgressMap = new Map<string, { courseOfferingId: string; academicLevelId: string; academicLevelLabel: string; total: number; completed: number }>();

  const passedFinalGradeModuleIds = new Set(releasedFinalGradesRaw.filter((fg) => fg.isPassing).map((fg) => fg.moduleOfferingId));

  for (const enrollment of enrollments) {
    const defaultMOs = await prisma.moduleOffering.findMany({
      where: { courseOfferingId: enrollment.courseOfferingId },
      select: { id: true },
    });
    const effective = calculateEffectiveModuleAccess(defaultMOs, enrollment.moduleEnrollmentExceptions);
    const effectiveIds = effective.map((mo) => mo.id);

    const mods = moduleOfferingsData.filter((mo) => effectiveIds.includes(mo.id));
    for (const mo of mods) {
      const levelId = mo.templateModule.academicLevel.id;
      const levelLabel = mo.templateModule.academicLevel.label;
      const key = `${enrollment.courseOfferingId}:${levelId}`;
      if (!courseProgressMap.has(key)) {
        courseProgressMap.set(key, { courseOfferingId: enrollment.courseOfferingId, academicLevelId: levelId, academicLevelLabel: levelLabel, total: 0, completed: 0 });
      }
      const entry = courseProgressMap.get(key)!;
      entry.total++;
      if (passedFinalGradeModuleIds.has(mo.id)) entry.completed++;
    }
  }

  const courseProgress: CourseProgress[] = Array.from(courseProgressMap.values()).map((e) => ({
    courseOfferingId: e.courseOfferingId,
    academicLevelId: e.academicLevelId,
    academicLevelLabel: e.academicLevelLabel,
    completedModules: e.completed,
    totalModules: e.total,
  }));

  // ── attention items ────────────────────────────────────────────────────────

  const attentionItems: AttentionItem[] = [];
  const reminderCutoff = new Date(now.getTime() + reminderPeriodDays * 24 * 60 * 60 * 1000);

  // Low attendance
  for (const att of attendanceByModuleOffering) {
    if (att.percentage !== null && att.percentage < settings.attendanceRiskThresholdPercent) {
      attentionItems.push({
        kind: "LOW_ATTENDANCE",
        message: `Your attendance for ${att.moduleName} is ${att.percentage}%. Consider catching up with your educator.`,
        moduleOfferingId: att.moduleOfferingId,
      });
    }
  }

  // Overdue assignment without submission and upcoming deadline
  for (const assignment of dueAssignments) {
    const isOverdue = assignment.deadline < now;
    const isDueWithinReminder = assignment.deadline >= now && assignment.deadline <= reminderCutoff;

    if (isOverdue && assignment.submissionStatus === "NOT_SUBMITTED") {
      attentionItems.push({
        kind: "OVERDUE_ASSIGNMENT",
        message: `"${assignment.title}" was due on ${assignment.deadline.toDateString()}. Please contact your educator.`,
        moduleOfferingId: assignment.moduleOfferingId,
        assignmentId: assignment.id,
      });
    } else if (isDueWithinReminder && assignment.submissionStatus === "NOT_SUBMITTED") {
      attentionItems.push({
        kind: "UPCOMING_DEADLINE",
        message: `"${assignment.title}" is due on ${assignment.deadline.toDateString()}. Make sure to submit on time.`,
        moduleOfferingId: assignment.moduleOfferingId,
        assignmentId: assignment.id,
      });
    }
  }

  // Released final grade below pass threshold
  for (const fg of releasedFinalGrades) {
    if (!fg.isPassing) {
      attentionItems.push({
        kind: "FAILED_FINAL_GRADE",
        message: `Your final grade for ${fg.moduleName} is ${fg.percentage}%. Speak with your educator about next steps.`,
        moduleOfferingId: fg.moduleOfferingId,
      });
    }
  }

  return {
    dueAssignments,
    attendanceByModuleOffering,
    releasedMarks,
    releasedFinalGrades,
    chatActivity,
    upcomingCalendarEvents,
    courseProgress,
    attentionItems,
  };
}
