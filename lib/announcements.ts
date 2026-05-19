import sanitizeHtml from "sanitize-html";
import { prisma } from "./prisma";
import { calculateEffectiveModuleAccess } from "./enrollment";

// ── sanitize ──────────────────────────────────────────────────────────────────

function sanitizeBody(raw: string): string {
  return sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["h1", "h2", "h3", "u", "s"]),
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
    },
    disallowedTagsMode: "discard",
  });
}

// ── createAnnouncement ────────────────────────────────────────────────────────

type SharedLink = { url: string; title?: string };

export type CreateAnnouncementInput = {
  createdById: string;
  scope: "INSTITUTION" | "COURSE_OFFERING" | "MODULE_OFFERING";
  courseOfferingId?: string;
  moduleOfferingId?: string;
  body: string;
  expiresAt?: Date;
  sharedLinks?: SharedLink[];
  fileAssetIds?: string[];
};

export async function createAnnouncement(input: CreateAnnouncementInput) {
  const creator = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.createdById } });

  if (input.scope === "INSTITUTION") {
    if (creator.role !== "SUPER_ADMINISTRATOR" && creator.role !== "ADMINISTRATOR") {
      throw new Error("Permission denied: only Super Administrators and Administrators may create institution-scoped Announcements");
    }
  }

  if (input.scope === "COURSE_OFFERING") {
    if (creator.role !== "SUPER_ADMINISTRATOR" && creator.role !== "ADMINISTRATOR") {
      throw new Error("Permission denied: only Super Administrators and Administrators may create course-offering-scoped Announcements");
    }
    if (!input.courseOfferingId) {
      throw new Error("courseOfferingId is required for COURSE_OFFERING scope");
    }
  }

  if (input.scope === "MODULE_OFFERING") {
    if (!input.moduleOfferingId) {
      throw new Error("moduleOfferingId is required for MODULE_OFFERING scope");
    }
    const moduleOffering = await prisma.moduleOffering.findUniqueOrThrow({ where: { id: input.moduleOfferingId } });
    if (creator.role === "STUDENT") {
      throw new Error("Permission denied: Students may not create Announcements");
    }
    if (creator.role === "EDUCATOR" && moduleOffering.primaryEducatorId !== creator.id) {
      throw new Error("Permission denied: Educator may only create Announcements for their assigned Module Offerings");
    }
  }

  const sanitizedBody = sanitizeBody(input.body);

  return prisma.$transaction(async (tx) => {
    const announcement = await tx.announcement.create({
      data: {
        scope: input.scope,
        courseOfferingId: input.courseOfferingId ?? null,
        moduleOfferingId: input.moduleOfferingId ?? null,
        body: sanitizedBody,
        expiresAt: input.expiresAt ?? null,
        createdById: input.createdById,
        sharedLinks: input.sharedLinks
          ? { create: input.sharedLinks.map((l) => ({ url: l.url, title: l.title ?? null })) }
          : undefined,
        attachments: input.fileAssetIds
          ? { create: input.fileAssetIds.map((id) => ({ fileAssetId: id })) }
          : undefined,
      },
    });

    const recipientIds = await resolveRecipients(input, tx);

    if (recipientIds.length > 0) {
      await tx.notification.createMany({
        data: recipientIds.map((recipientId) => ({
          recipientId,
          sourceType: "ANNOUNCEMENT" as const,
          announcementId: announcement.id,
          title: buildNotificationTitle(input.scope),
        })),
      });
    }

    return announcement;
  });
}

function buildNotificationTitle(scope: CreateAnnouncementInput["scope"]): string {
  if (scope === "INSTITUTION") return "New Institution Announcement";
  if (scope === "COURSE_OFFERING") return "New Course Announcement";
  return "New Module Announcement";
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function resolveRecipients(input: CreateAnnouncementInput, tx: Tx): Promise<string[]> {
  if (input.scope === "INSTITUTION") {
    const accounts = await tx.userAccount.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    return accounts.map((a) => a.id);
  }

  if (input.scope === "COURSE_OFFERING" && input.courseOfferingId) {
    const [enrollments, moduleOfferings] = await Promise.all([
      tx.enrollment.findMany({
        where: { courseOfferingId: input.courseOfferingId, status: "ACTIVE" },
        select: { studentId: true },
      }),
      tx.moduleOffering.findMany({
        where: { courseOfferingId: input.courseOfferingId },
        select: { primaryEducatorId: true },
      }),
    ]);
    const ids = new Set<string>();
    for (const e of enrollments) ids.add(e.studentId);
    for (const mo of moduleOfferings) ids.add(mo.primaryEducatorId);
    return [...ids];
  }

  if (input.scope === "MODULE_OFFERING" && input.moduleOfferingId) {
    const moduleOffering = await tx.moduleOffering.findUniqueOrThrow({
      where: { id: input.moduleOfferingId },
      select: { primaryEducatorId: true, courseOfferingId: true },
    });

    const allModuleOfferings = await tx.moduleOffering.findMany({
      where: { courseOfferingId: moduleOffering.courseOfferingId },
      select: { id: true },
    });

    const enrollments = await tx.enrollment.findMany({
      where: { courseOfferingId: moduleOffering.courseOfferingId, status: "ACTIVE" },
      select: {
        studentId: true,
        moduleEnrollmentExceptions: {
          select: { moduleOfferingId: true, exceptionType: true },
        },
      },
    });

    const ids = new Set<string>();
    ids.add(moduleOffering.primaryEducatorId);

    for (const enrollment of enrollments) {
      const effective = calculateEffectiveModuleAccess(allModuleOfferings, enrollment.moduleEnrollmentExceptions);
      if (effective.some((mo) => mo.id === input.moduleOfferingId)) {
        ids.add(enrollment.studentId);
      }
    }

    return [...ids];
  }

  return [];
}

// ── listActiveAnnouncements ───────────────────────────────────────────────────

type ListActiveAnnouncementsInput = {
  viewerId: string;
  asOf?: Date;
};

export async function listActiveAnnouncements(input: ListActiveAnnouncementsInput) {
  const now = input.asOf ?? new Date();

  return prisma.announcement.findMany({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    include: { sharedLinks: true, attachments: true },
  });
}

// ── listAllAnnouncements ──────────────────────────────────────────────────────

export async function listAllAnnouncements() {
  return prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: { sharedLinks: true, attachments: true },
  });
}
