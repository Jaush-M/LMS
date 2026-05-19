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

// ── guards ────────────────────────────────────────────────────────────────────

async function assertEducatorOwnsModuleOffering(moduleOfferingId: string, actorId: string) {
  const actor = await prisma.userAccount.findUniqueOrThrow({ where: { id: actorId } });

  if (actor.role === "STUDENT") {
    throw new Error("Permission denied: Students may not manage Assignments");
  }

  if (actor.role === "ADMINISTRATOR" || actor.role === "SUPER_ADMINISTRATOR") {
    return;
  }

  const moduleOffering = await prisma.moduleOffering.findUniqueOrThrow({ where: { id: moduleOfferingId } });
  if (moduleOffering.primaryEducatorId !== actor.id) {
    throw new Error("Permission denied: Educator is not assigned to this Module Offering");
  }
}

async function assertAssignmentOwner(assignmentId: string, actorId: string) {
  const assignment = await prisma.assignment.findUniqueOrThrow({ where: { id: assignmentId } });
  await assertEducatorOwnsModuleOffering(assignment.moduleOfferingId, actorId);
  return assignment;
}

// ── createAssignment ──────────────────────────────────────────────────────────

export type CreateAssignmentInput = {
  moduleOfferingId: string;
  createdById: string;
  title: string;
  body: string;
  deadline: Date;
  maximumMark: number;
  sharedLinks?: { url: string; title?: string }[];
  fileAssetIds?: string[];
  contentSectionId?: string;
};

export async function createAssignment(input: CreateAssignmentInput) {
  await assertEducatorOwnsModuleOffering(input.moduleOfferingId, input.createdById);

  if (input.contentSectionId) {
    const section = await prisma.contentSection.findUniqueOrThrow({ where: { id: input.contentSectionId } });
    if (section.moduleOfferingId !== input.moduleOfferingId) {
      throw new Error("Content Section does not belong to this Module Offering");
    }
  }

  if (input.fileAssetIds?.length) {
    const { validateFileSize } = await import("./storage/validate-file-size");
    const assets = await prisma.fileAsset.findMany({
      where: { id: { in: input.fileAssetIds } },
      select: { sizeBytes: true },
    });
    for (const asset of assets) {
      validateFileSize("ASSIGNMENT_ATTACHMENT", asset.sizeBytes);
    }
  }

  return prisma.assignment.create({
    data: {
      moduleOfferingId: input.moduleOfferingId,
      createdById: input.createdById,
      contentSectionId: input.contentSectionId ?? null,
      title: input.title,
      body: sanitizeBody(input.body),
      deadline: input.deadline,
      maximumMark: input.maximumMark,
      sharedLinks: input.sharedLinks
        ? { create: input.sharedLinks.map((l) => ({ url: l.url, title: l.title ?? null })) }
        : undefined,
      attachments: input.fileAssetIds
        ? { create: input.fileAssetIds.map((id) => ({ fileAssetId: id })) }
        : undefined,
    },
  });
}

// ── publishAssignment ─────────────────────────────────────────────────────────

export type PublishAssignmentInput = {
  id: string;
  publishedById: string;
};

export async function publishAssignment(input: PublishAssignmentInput) {
  const assignment = await assertAssignmentOwner(input.id, input.publishedById);

  return prisma.$transaction(async (tx) => {
    const published = await tx.assignment.update({
      where: { id: input.id },
      data: { status: "PUBLISHED" },
    });

    const moduleOffering = await tx.moduleOffering.findUniqueOrThrow({
      where: { id: assignment.moduleOfferingId },
      select: { courseOfferingId: true },
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

    const recipientIds = new Set<string>();
    for (const enrollment of enrollments) {
      const effective = calculateEffectiveModuleAccess(allModuleOfferings, enrollment.moduleEnrollmentExceptions);
      if (effective.some((mo) => mo.id === assignment.moduleOfferingId)) {
        recipientIds.add(enrollment.studentId);
      }
    }

    if (recipientIds.size > 0) {
      await tx.notification.createMany({
        data: [...recipientIds].map((recipientId) => ({
          recipientId,
          sourceType: "ASSIGNMENT" as const,
          assignmentId: input.id,
          title: "New Assignment Published",
        })),
      });
    }

    return published;
  });
}

// ── unpublishAssignment ───────────────────────────────────────────────────────

export type UnpublishAssignmentInput = {
  id: string;
  unpublishedById: string;
};

export async function unpublishAssignment(input: UnpublishAssignmentInput) {
  await assertAssignmentOwner(input.id, input.unpublishedById);

  return prisma.assignment.update({
    where: { id: input.id },
    data: { status: "DRAFT" },
  });
}

// ── submitAssignment ──────────────────────────────────────────────────────────

export type SubmitAssignmentInput = {
  assignmentId: string;
  studentId: string;
  fileAssetId: string;
};

export async function submitAssignment(input: SubmitAssignmentInput) {
  const student = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.studentId } });
  if (student.role !== "STUDENT") {
    throw new Error("Permission denied: only Students may submit Assignments");
  }

  const assignment = await prisma.assignment.findUniqueOrThrow({
    where: { id: input.assignmentId },
    include: { moduleOffering: { select: { courseOfferingId: true, id: true } } },
  });

  if (assignment.status !== "PUBLISHED") {
    throw new Error("Assignment is not published");
  }

  const moduleOfferingId = assignment.moduleOfferingId;
  const courseOfferingId = assignment.moduleOffering.courseOfferingId;

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: input.studentId, courseOfferingId, status: "ACTIVE" },
    include: { moduleEnrollmentExceptions: { select: { moduleOfferingId: true, exceptionType: true } } },
  });

  if (!enrollment) {
    throw new Error("Access denied: Student does not have access to this Module Offering");
  }

  const allModuleOfferings = await prisma.moduleOffering.findMany({
    where: { courseOfferingId },
    select: { id: true },
  });

  const effective = calculateEffectiveModuleAccess(allModuleOfferings, enrollment.moduleEnrollmentExceptions);
  if (!effective.some((mo) => mo.id === moduleOfferingId)) {
    throw new Error("Access denied: Student does not have effective access to this Module Offering");
  }

  const { validateFileSize } = await import("./storage/validate-file-size");
  const fileAsset = await prisma.fileAsset.findUniqueOrThrow({ where: { id: input.fileAssetId }, select: { sizeBytes: true } });
  validateFileSize("SUBMISSION", fileAsset.sizeBytes);

  const existing = await prisma.assignmentSubmission.findUnique({
    where: { assignmentId_studentId: { assignmentId: input.assignmentId, studentId: input.studentId } },
  });

  const now = new Date();
  const effectiveDeadline = await getEffectiveDeadline(input.assignmentId);
  const isBeforeDeadline = now <= effectiveDeadline;

  if (existing) {
    if (existing.status === "MARKED") {
      throw new Error("Cannot replace a marked submission");
    }
    if (!isBeforeDeadline) {
      throw new Error("Cannot replace a submission after the deadline");
    }
    return prisma.assignmentSubmission.update({
      where: { id: existing.id },
      data: { fileAssetId: input.fileAssetId, submittedAt: now, status: "SUBMITTED" },
    });
  }

  return prisma.assignmentSubmission.create({
    data: {
      assignmentId: input.assignmentId,
      studentId: input.studentId,
      fileAssetId: input.fileAssetId,
      status: isBeforeDeadline ? "SUBMITTED" : "LATE",
      submittedAt: now,
    },
  });
}

// ── listSubmissions ───────────────────────────────────────────────────────────

export type ListSubmissionsInput = {
  assignmentId: string;
  viewerId: string;
};

export async function listSubmissions(input: ListSubmissionsInput) {
  await assertAssignmentOwner(input.assignmentId, input.viewerId);

  return prisma.assignmentSubmission.findMany({
    where: { assignmentId: input.assignmentId },
    orderBy: { submittedAt: "asc" },
  });
}

// ── listAssignments ───────────────────────────────────────────────────────────

export type ListAssignmentsInput = {
  moduleOfferingId: string;
  viewerId: string;
};

export async function listAssignments(input: ListAssignmentsInput) {
  const viewer = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.viewerId } });

  const isPrivileged = viewer.role === "ADMINISTRATOR" || viewer.role === "SUPER_ADMINISTRATOR";
  const isAssignedEducator =
    viewer.role === "EDUCATOR" &&
    (await prisma.moduleOffering.findFirst({
      where: { id: input.moduleOfferingId, primaryEducatorId: viewer.id },
    })) !== null;

  const canSeeAll = isPrivileged || isAssignedEducator;

  if (!canSeeAll) {
    const moduleOffering = await prisma.moduleOffering.findUniqueOrThrow({ where: { id: input.moduleOfferingId } });

    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId: viewer.id, courseOfferingId: moduleOffering.courseOfferingId, status: "ACTIVE" },
      include: { moduleEnrollmentExceptions: { select: { moduleOfferingId: true, exceptionType: true } } },
    });

    if (!enrollment) {
      throw new Error("Access denied: Student does not have access to this Module Offering");
    }

    const allModuleOfferings = await prisma.moduleOffering.findMany({
      where: { courseOfferingId: moduleOffering.courseOfferingId },
      select: { id: true },
    });

    const effective = calculateEffectiveModuleAccess(allModuleOfferings, enrollment.moduleEnrollmentExceptions);
    if (!effective.some((mo) => mo.id === input.moduleOfferingId)) {
      throw new Error("Access denied: Student does not have effective access to this Module Offering");
    }
  }

  return prisma.assignment.findMany({
    where: {
      moduleOfferingId: input.moduleOfferingId,
      ...(canSeeAll ? {} : { status: "PUBLISHED" }),
    },
    orderBy: { deadline: "asc" },
    include: { sharedLinks: true, attachments: true },
  });
}

// ── extendDeadline ────────────────────────────────────────────────────────────

export type ExtendDeadlineInput = {
  assignmentId: string;
  extendedById: string;
  newDeadline: Date;
  reason: string;
};

type ExtendDeadlineResult = {
  extension: {
    id: string;
    assignmentId: string;
    oldDeadline: Date;
    newDeadline: Date;
    reason: string;
    createdById: string;
    createdAt: Date;
  };
  auditEntry: {
    id: string;
    entityType: string;
    entityId: string | null;
    action: string;
    actorId: string;
    reason: string | null;
  };
};

export async function extendDeadline(input: ExtendDeadlineInput): Promise<ExtendDeadlineResult> {
  await assertAssignmentOwner(input.assignmentId, input.extendedById);

  const assignment = await prisma.assignment.findUniqueOrThrow({ where: { id: input.assignmentId } });

  return prisma.$transaction(async (tx) => {
    const extension = await tx.assignmentDeadlineExtension.create({
      data: {
        assignmentId: input.assignmentId,
        oldDeadline: assignment.deadline,
        newDeadline: input.newDeadline,
        reason: input.reason,
        createdById: input.extendedById,
      },
    });

    const auditEntry = await tx.auditLogEntry.create({
      data: {
        eventType: "OPERATIONAL",
        action: "DEADLINE_EXTENDED",
        actorId: input.extendedById,
        entityType: "Assignment",
        entityId: input.assignmentId,
        beforeJson: JSON.stringify({ deadline: assignment.deadline }),
        afterJson: JSON.stringify({ deadline: input.newDeadline }),
        reason: input.reason,
      },
    });

    await tx.assignmentSubmission.updateMany({
      where: {
        assignmentId: input.assignmentId,
        status: "LATE",
        submittedAt: { lte: input.newDeadline },
      },
      data: { status: "SUBMITTED" },
    });

    const moduleOffering = await tx.moduleOffering.findUniqueOrThrow({
      where: { id: assignment.moduleOfferingId },
      select: { courseOfferingId: true },
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

    const recipientIds = new Set<string>();
    for (const enrollment of enrollments) {
      const effective = calculateEffectiveModuleAccess(allModuleOfferings, enrollment.moduleEnrollmentExceptions);
      if (effective.some((mo) => mo.id === assignment.moduleOfferingId)) {
        recipientIds.add(enrollment.studentId);
      }
    }

    if (recipientIds.size > 0) {
      await tx.notification.createMany({
        data: [...recipientIds].map((recipientId) => ({
          recipientId,
          sourceType: "ASSIGNMENT" as const,
          assignmentId: input.assignmentId,
          title: "Assignment Deadline Extended",
        })),
      });
    }

    return {
      extension: {
        id: extension.id,
        assignmentId: extension.assignmentId,
        oldDeadline: extension.oldDeadline,
        newDeadline: extension.newDeadline,
        reason: extension.reason,
        createdById: extension.createdById,
        createdAt: extension.createdAt,
      },
      auditEntry: {
        id: auditEntry.id,
        entityType: auditEntry.entityType,
        entityId: auditEntry.entityId,
        action: auditEntry.action,
        actorId: auditEntry.actorId,
        reason: auditEntry.reason,
      },
    };
  });
}

// ── getEffectiveDeadline ──────────────────────────────────────────────────────

export async function getEffectiveDeadline(assignmentId: string): Promise<Date> {
  const assignment = await prisma.assignment.findUniqueOrThrow({
    where: { id: assignmentId },
    select: { deadline: true },
  });

  const latestExtension = await prisma.assignmentDeadlineExtension.findFirst({
    where: { assignmentId },
    orderBy: { createdAt: "desc" },
    select: { newDeadline: true },
  });

  return latestExtension ? latestExtension.newDeadline : assignment.deadline;
}
