import { prisma } from "./prisma";
import { calculateEffectiveModuleAccess } from "./enrollment";

// ── types ─────────────────────────────────────────────────────────────────────

export type CalendarFeedItemKind =
  | "INSTITUTION_EVENT"
  | "COURSE_OFFERING_EVENT"
  | "MODULE_OFFERING_EVENT"
  | "CLASS_SESSION"
  | "ASSIGNMENT_DEADLINE";

export type CalendarFeedItem = {
  id: string;
  kind: CalendarFeedItemKind;
  title: string;
  startAt: Date;
  finishAt: Date | null;
  courseOfferingId?: string;
  moduleOfferingId?: string;
};

// ── guards ────────────────────────────────────────────────────────────────────

async function assertAdministrator(actorId: string) {
  const actor = await prisma.userAccount.findUniqueOrThrow({ where: { id: actorId } });
  if (actor.role !== "ADMINISTRATOR" && actor.role !== "SUPER_ADMINISTRATOR") {
    throw new Error("Permission denied: only Administrators may perform this action");
  }
  return actor;
}

async function assertEducatorOwnsModuleOffering(actorId: string, moduleOfferingId: string) {
  const actor = await prisma.userAccount.findUniqueOrThrow({ where: { id: actorId } });
  if (actor.role === "STUDENT") {
    throw new Error("Permission denied: Students may not manage Module Offering Events");
  }
  if (actor.role === "ADMINISTRATOR" || actor.role === "SUPER_ADMINISTRATOR") {
    return;
  }
  const moduleOffering = await prisma.moduleOffering.findUniqueOrThrow({ where: { id: moduleOfferingId } });
  if (moduleOffering.primaryEducatorId !== actorId) {
    throw new Error("Permission denied: Educator is not assigned to this Module Offering");
  }
}

// ── createInstitutionEvent ────────────────────────────────────────────────────

export type CreateInstitutionEventInput = {
  createdById: string;
  title: string;
  startAt: Date;
  finishAt?: Date;
};

export async function createInstitutionEvent(input: CreateInstitutionEventInput) {
  await assertAdministrator(input.createdById);
  return prisma.institutionEvent.create({
    data: {
      title: input.title,
      startAt: input.startAt,
      finishAt: input.finishAt ?? null,
      createdById: input.createdById,
    },
  });
}

// ── createCourseOfferingEvent ─────────────────────────────────────────────────

export type CreateCourseOfferingEventInput = {
  createdById: string;
  courseOfferingId: string;
  title: string;
  startAt: Date;
  finishAt?: Date;
};

export async function createCourseOfferingEvent(input: CreateCourseOfferingEventInput) {
  await assertAdministrator(input.createdById);
  return prisma.courseOfferingEvent.create({
    data: {
      courseOfferingId: input.courseOfferingId,
      title: input.title,
      startAt: input.startAt,
      finishAt: input.finishAt ?? null,
      createdById: input.createdById,
    },
  });
}

// ── createModuleOfferingEvent ─────────────────────────────────────────────────

export type CreateModuleOfferingEventInput = {
  createdById: string;
  moduleOfferingId: string;
  title: string;
  startAt: Date;
  finishAt?: Date;
};

export async function createModuleOfferingEvent(input: CreateModuleOfferingEventInput) {
  await assertEducatorOwnsModuleOffering(input.createdById, input.moduleOfferingId);
  return prisma.moduleOfferingEvent.create({
    data: {
      moduleOfferingId: input.moduleOfferingId,
      title: input.title,
      startAt: input.startAt,
      finishAt: input.finishAt ?? null,
      createdById: input.createdById,
    },
  });
}

// ── getCalendarFeed ───────────────────────────────────────────────────────────

export async function getCalendarFeed(actorId: string): Promise<CalendarFeedItem[]> {
  const actor = await prisma.userAccount.findUniqueOrThrow({ where: { id: actorId } });
  const items: CalendarFeedItem[] = [];

  // Institution Events — visible to everyone
  const institutionEvents = await prisma.institutionEvent.findMany();
  for (const e of institutionEvents) {
    items.push({ id: e.id, kind: "INSTITUTION_EVENT", title: e.title, startAt: e.startAt, finishAt: e.finishAt });
  }

  if (actor.role === "ADMINISTRATOR" || actor.role === "SUPER_ADMINISTRATOR") {
    // All Course Offering Events
    const coEvents = await prisma.courseOfferingEvent.findMany();
    for (const e of coEvents) {
      items.push({ id: e.id, kind: "COURSE_OFFERING_EVENT", title: e.title, startAt: e.startAt, finishAt: e.finishAt, courseOfferingId: e.courseOfferingId });
    }

    // All Module Offering Events
    const moEvents = await prisma.moduleOfferingEvent.findMany();
    for (const e of moEvents) {
      items.push({ id: e.id, kind: "MODULE_OFFERING_EVENT", title: e.title, startAt: e.startAt, finishAt: e.finishAt, moduleOfferingId: e.moduleOfferingId });
    }

    // All Class Sessions
    const sessions = await prisma.classSession.findMany({ include: { sessionType: true } });
    for (const s of sessions) {
      items.push({ id: s.id, kind: "CLASS_SESSION", title: s.sessionType.name, startAt: s.startAt, finishAt: s.finishAt, moduleOfferingId: s.moduleOfferingId });
    }

    // All published assignment deadlines
    const assignments = await prisma.assignment.findMany({ where: { status: "PUBLISHED" } });
    for (const a of assignments) {
      items.push({ id: a.id, kind: "ASSIGNMENT_DEADLINE", title: a.title, startAt: a.deadline, finishAt: null, moduleOfferingId: a.moduleOfferingId });
    }
  } else if (actor.role === "EDUCATOR") {
    const moduleOfferings = await prisma.moduleOffering.findMany({
      where: { primaryEducatorId: actorId },
      select: { id: true, courseOfferingId: true },
    });
    const moduleOfferingIds = moduleOfferings.map((mo) => mo.id);
    const courseOfferingIds = [...new Set(moduleOfferings.map((mo) => mo.courseOfferingId))];

    // Course Offering Events for their course offerings
    const coEvents = await prisma.courseOfferingEvent.findMany({
      where: { courseOfferingId: { in: courseOfferingIds } },
    });
    for (const e of coEvents) {
      items.push({ id: e.id, kind: "COURSE_OFFERING_EVENT", title: e.title, startAt: e.startAt, finishAt: e.finishAt, courseOfferingId: e.courseOfferingId });
    }

    // Module Offering Events for their module offerings
    const moEvents = await prisma.moduleOfferingEvent.findMany({
      where: { moduleOfferingId: { in: moduleOfferingIds } },
    });
    for (const e of moEvents) {
      items.push({ id: e.id, kind: "MODULE_OFFERING_EVENT", title: e.title, startAt: e.startAt, finishAt: e.finishAt, moduleOfferingId: e.moduleOfferingId });
    }

    // Class Sessions for their module offerings
    const sessions = await prisma.classSession.findMany({
      where: { moduleOfferingId: { in: moduleOfferingIds } },
      include: { sessionType: true },
    });
    for (const s of sessions) {
      items.push({ id: s.id, kind: "CLASS_SESSION", title: s.sessionType.name, startAt: s.startAt, finishAt: s.finishAt, moduleOfferingId: s.moduleOfferingId });
    }

    // Published assignment deadlines for their module offerings
    const assignments = await prisma.assignment.findMany({
      where: { moduleOfferingId: { in: moduleOfferingIds }, status: "PUBLISHED" },
    });
    for (const a of assignments) {
      items.push({ id: a.id, kind: "ASSIGNMENT_DEADLINE", title: a.title, startAt: a.deadline, finishAt: null, moduleOfferingId: a.moduleOfferingId });
    }
  } else {
    // Student — filter by active enrollments and Effective Module Access
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: actorId, status: "ACTIVE" },
      select: {
        courseOfferingId: true,
        moduleEnrollmentExceptions: { select: { moduleOfferingId: true, exceptionType: true } },
      },
    });

    const enrolledCourseOfferingIds = enrollments.map((e) => e.courseOfferingId);

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

    // Course Offering Events for enrolled course offerings
    const coEvents = await prisma.courseOfferingEvent.findMany({
      where: { courseOfferingId: { in: enrolledCourseOfferingIds } },
    });
    for (const e of coEvents) {
      items.push({ id: e.id, kind: "COURSE_OFFERING_EVENT", title: e.title, startAt: e.startAt, finishAt: e.finishAt, courseOfferingId: e.courseOfferingId });
    }

    // Module Offering Events for effective module access
    const moEvents = await prisma.moduleOfferingEvent.findMany({
      where: { moduleOfferingId: { in: uniqueModuleOfferingIds } },
    });
    for (const e of moEvents) {
      items.push({ id: e.id, kind: "MODULE_OFFERING_EVENT", title: e.title, startAt: e.startAt, finishAt: e.finishAt, moduleOfferingId: e.moduleOfferingId });
    }

    // Class Sessions for effective module access
    const sessions = await prisma.classSession.findMany({
      where: { moduleOfferingId: { in: uniqueModuleOfferingIds } },
      include: { sessionType: true },
    });
    for (const s of sessions) {
      items.push({ id: s.id, kind: "CLASS_SESSION", title: s.sessionType.name, startAt: s.startAt, finishAt: s.finishAt, moduleOfferingId: s.moduleOfferingId });
    }

    // Published assignment deadlines for effective module access
    const assignments = await prisma.assignment.findMany({
      where: { moduleOfferingId: { in: uniqueModuleOfferingIds }, status: "PUBLISHED" },
    });
    for (const a of assignments) {
      items.push({ id: a.id, kind: "ASSIGNMENT_DEADLINE", title: a.title, startAt: a.deadline, finishAt: null, moduleOfferingId: a.moduleOfferingId });
    }
  }

  items.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return items;
}
