import { prisma } from "./prisma";

// ── types ─────────────────────────────────────────────────────────────────────

export type ActiveCourseOffering = {
  id: string;
  name: string;
  courseName: string;
  enrolmentCount: number;
  startAt: Date;
  finishAt: Date;
};

export type UpcomingEvent = {
  id: string;
  title: string;
  startAt: Date;
  kind: "INSTITUTION" | "COURSE_OFFERING";
  courseOfferingId?: string;
  courseOfferingName?: string;
};

export type ModuleOfferingWithoutActiveEducator = {
  id: string;
  moduleName: string;
  courseOfferingId: string;
  courseOfferingName: string;
  primaryEducatorName: string;
};

export type AdministratorDashboardData = {
  activeCourseOfferings: ActiveCourseOffering[];
  upcomingEvents: UpcomingEvent[];
  moduleOfferingsWithoutActiveEducator: ModuleOfferingWithoutActiveEducator[];
  attendanceCompletionPercent: number | null;
};

// ── getAdministratorDashboard ─────────────────────────────────────────────────

export async function getAdministratorDashboard(now: Date = new Date()): Promise<AdministratorDashboardData> {
  // ── active course offerings with enrollment counts ─────────────────────────

  const activeCourseOfferingsRaw = await prisma.courseOffering.findMany({
    where: { status: "ACTIVE" },
    include: {
      course: { select: { name: true } },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { startAt: "asc" },
  });

  const activeCourseOfferings: ActiveCourseOffering[] = activeCourseOfferingsRaw.map((co) => ({
    id: co.id,
    name: co.name,
    courseName: co.course.name,
    enrolmentCount: co._count.enrollments,
    startAt: co.startAt,
    finishAt: co.finishAt,
  }));

  // ── upcoming institution and course offering events ────────────────────────

  const [institutionEventsRaw, courseOfferingEventsRaw] = await Promise.all([
    prisma.institutionEvent.findMany({
      where: { startAt: { gte: now } },
      orderBy: { startAt: "asc" },
    }),
    prisma.courseOfferingEvent.findMany({
      where: { startAt: { gte: now } },
      include: { courseOffering: { select: { id: true, name: true } } },
      orderBy: { startAt: "asc" },
    }),
  ]);

  const upcomingEvents: UpcomingEvent[] = [
    ...institutionEventsRaw.map((e): UpcomingEvent => ({
      id: e.id,
      title: e.title,
      startAt: e.startAt,
      kind: "INSTITUTION",
    })),
    ...courseOfferingEventsRaw.map((e): UpcomingEvent => ({
      id: e.id,
      title: e.title,
      startAt: e.startAt,
      kind: "COURSE_OFFERING",
      courseOfferingId: e.courseOffering.id,
      courseOfferingName: e.courseOffering.name,
    })),
  ].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  // ── module offerings without an active primary educator ───────────────────

  const moduleOfferingsWithInactiveEducatorRaw = await prisma.moduleOffering.findMany({
    where: {
      primaryEducator: { status: { not: "ACTIVE" } },
    },
    include: {
      templateModule: { include: { module: { select: { name: true } } } },
      courseOffering: { select: { id: true, name: true } },
      primaryEducator: { include: { user: { select: { name: true } } } },
    },
  });

  const moduleOfferingsWithoutActiveEducator: ModuleOfferingWithoutActiveEducator[] = moduleOfferingsWithInactiveEducatorRaw.map((mo) => ({
    id: mo.id,
    moduleName: mo.templateModule.module.name,
    courseOfferingId: mo.courseOffering.id,
    courseOfferingName: mo.courseOffering.name,
    primaryEducatorName: mo.primaryEducator.user.name,
  }));

  // ── attendance completion across active course offerings ──────────────────

  const activeCourseOfferingIds = activeCourseOfferingsRaw.map((co) => co.id);

  if (activeCourseOfferingIds.length === 0) {
    return {
      activeCourseOfferings,
      upcomingEvents,
      moduleOfferingsWithoutActiveEducator,
      attendanceCompletionPercent: null,
    };
  }

  const pastRequiredSessions = await prisma.classSession.findMany({
    where: {
      moduleOffering: { courseOfferingId: { in: activeCourseOfferingIds } },
      startAt: { lte: now },
      attendanceRequired: true,
    },
    select: { id: true, educatorAttendance: { select: { id: true } } },
  });

  if (pastRequiredSessions.length === 0) {
    return {
      activeCourseOfferings,
      upcomingEvents,
      moduleOfferingsWithoutActiveEducator,
      attendanceCompletionPercent: null,
    };
  }

  const submittedCount = pastRequiredSessions.filter((s) => s.educatorAttendance !== null).length;
  const attendanceCompletionPercent = Math.round((submittedCount / pastRequiredSessions.length) * 100);

  return {
    activeCourseOfferings,
    upcomingEvents,
    moduleOfferingsWithoutActiveEducator,
    attendanceCompletionPercent,
  };
}
