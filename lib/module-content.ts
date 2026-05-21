import sanitizeHtml from "sanitize-html";
import { prisma } from "./prisma";
import { calculateEffectiveModuleAccess } from "./enrollment";
import { validateFileSize } from "./storage/validate-file-size";

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

async function assertEducatorOwnsModuleOffering(moduleOfferingId: string, educatorId: string) {
  const actor = await prisma.userAccount.findUniqueOrThrow({ where: { id: educatorId } });

  if (actor.role === "STUDENT") {
    throw new Error("Permission denied: Students may not manage Module Content");
  }

  if (actor.role === "ADMINISTRATOR" || actor.role === "SUPER_ADMINISTRATOR") {
    return;
  }

  const moduleOffering = await prisma.moduleOffering.findUniqueOrThrow({ where: { id: moduleOfferingId } });
  if (moduleOffering.primaryEducatorId !== actor.id) {
    throw new Error("Permission denied: Educator is not assigned to this Module Offering");
  }
}

async function assertSectionOwner(sectionId: string, actorId: string) {
  const section = await prisma.contentSection.findUniqueOrThrow({ where: { id: sectionId } });
  await assertEducatorOwnsModuleOffering(section.moduleOfferingId, actorId);
  return section;
}

// ── createContentSection ──────────────────────────────────────────────────────

export type CreateContentSectionInput = {
  moduleOfferingId: string;
  createdById: string;
  title: string;
  sortOrder: number;
};

export async function createContentSection(input: CreateContentSectionInput) {
  await assertEducatorOwnsModuleOffering(input.moduleOfferingId, input.createdById);

  return prisma.contentSection.create({
    data: {
      moduleOfferingId: input.moduleOfferingId,
      createdById: input.createdById,
      title: input.title,
      sortOrder: input.sortOrder,
    },
  });
}

// ── editContentSection ────────────────────────────────────────────────────────

export type EditContentSectionInput = {
  id: string;
  editedById: string;
  title: string;
};

export async function editContentSection(input: EditContentSectionInput) {
  await assertSectionOwner(input.id, input.editedById);

  return prisma.contentSection.update({
    where: { id: input.id },
    data: { title: input.title },
  });
}

// ── deleteContentSection ──────────────────────────────────────────────────────

export type DeleteContentSectionInput = {
  id: string;
  deletedById: string;
};

export async function deleteContentSection(input: DeleteContentSectionInput) {
  await assertSectionOwner(input.id, input.deletedById);

  await prisma.contentSection.delete({ where: { id: input.id } });
}

// ── reorderContentSections ────────────────────────────────────────────────────

export type ReorderContentSectionsInput = {
  moduleOfferingId: string;
  reorderedById: string;
  orderedIds: string[];
};

export async function reorderContentSections(input: ReorderContentSectionsInput) {
  await assertEducatorOwnsModuleOffering(input.moduleOfferingId, input.reorderedById);

  await prisma.$transaction(
    input.orderedIds.map((id, index) =>
      prisma.contentSection.update({ where: { id }, data: { sortOrder: index + 1 } })
    )
  );
}

// ── createModuleContent ───────────────────────────────────────────────────────

export type CreateModuleContentInput = {
  contentSectionId: string;
  createdById: string;
  title: string;
  body: string;
  sortOrder: number;
  sharedLinks?: { url: string; title?: string }[];
  fileAssetIds?: string[];
};

export async function createModuleContent(input: CreateModuleContentInput) {
  await assertSectionOwner(input.contentSectionId, input.createdById);

  if (input.fileAssetIds?.length) {
    const assets = await prisma.fileAsset.findMany({
      where: { id: { in: input.fileAssetIds } },
      select: { sizeBytes: true, category: true },
    });
    for (const asset of assets) {
      validateFileSize("CONTENT_ATTACHMENT", asset.sizeBytes);
    }
  }

  const sanitizedBody = sanitizeBody(input.body);

  return prisma.moduleContent.create({
    data: {
      contentSectionId: input.contentSectionId,
      createdById: input.createdById,
      title: input.title,
      body: sanitizedBody,
      sortOrder: input.sortOrder,
      sharedLinks: input.sharedLinks
        ? { create: input.sharedLinks.map((l) => ({ url: l.url, title: l.title ?? null })) }
        : undefined,
      attachments: input.fileAssetIds
        ? { create: input.fileAssetIds.map((id) => ({ fileAssetId: id })) }
        : undefined,
    },
  });
}

// ── editModuleContent ─────────────────────────────────────────────────────────

export type EditModuleContentInput = {
  id: string;
  editedById: string;
  title?: string;
  body?: string;
};

export async function editModuleContent(input: EditModuleContentInput) {
  const item = await prisma.moduleContent.findUniqueOrThrow({ where: { id: input.id } });
  await assertSectionOwner(item.contentSectionId, input.editedById);

  return prisma.moduleContent.update({
    where: { id: input.id },
    data: {
      title: input.title,
      body: input.body !== undefined ? sanitizeBody(input.body) : undefined,
    },
  });
}

// ── deleteModuleContent ───────────────────────────────────────────────────────

export type DeleteModuleContentInput = {
  id: string;
  deletedById: string;
};

export async function deleteModuleContent(input: DeleteModuleContentInput) {
  const item = await prisma.moduleContent.findUniqueOrThrow({ where: { id: input.id } });
  await assertSectionOwner(item.contentSectionId, input.deletedById);

  await prisma.moduleContent.delete({ where: { id: input.id } });
}

// ── reorderModuleContent ──────────────────────────────────────────────────────

export type ReorderModuleContentInput = {
  contentSectionId: string;
  reorderedById: string;
  orderedIds: string[];
};

export async function reorderModuleContent(input: ReorderModuleContentInput) {
  await assertSectionOwner(input.contentSectionId, input.reorderedById);

  await prisma.$transaction(
    input.orderedIds.map((id, index) =>
      prisma.moduleContent.update({ where: { id }, data: { sortOrder: index + 1 } })
    )
  );
}

// ── publishModuleContent ──────────────────────────────────────────────────────

export type PublishModuleContentInput = {
  id: string;
  publishedById: string;
};

export async function publishModuleContent(input: PublishModuleContentInput) {
  const item = await prisma.moduleContent.findUniqueOrThrow({
    where: { id: input.id },
    include: { contentSection: true },
  });
  await assertSectionOwner(item.contentSectionId, input.publishedById);

  return prisma.$transaction(async (tx) => {
    const published = await tx.moduleContent.update({
      where: { id: input.id },
      data: { status: "PUBLISHED" },
    });

    const moduleOfferingId = item.contentSection.moduleOfferingId;

    const moduleOffering = await tx.moduleOffering.findUniqueOrThrow({
      where: { id: moduleOfferingId },
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
      if (effective.some((mo) => mo.id === moduleOfferingId)) {
        recipientIds.add(enrollment.studentId);
      }
    }

    if (recipientIds.size > 0) {
      await tx.notification.createMany({
        data: [...recipientIds].map((recipientId) => ({
          recipientId,
          sourceType: "MODULE_CONTENT" as const,
          moduleContentId: input.id,
          title: "New Module Content Published",
        })),
      });
    }

    return published;
  });
}

// ── unpublishModuleContent ────────────────────────────────────────────────────

export type UnpublishModuleContentInput = {
  id: string;
  unpublishedById: string;
};

export async function unpublishModuleContent(input: UnpublishModuleContentInput) {
  const item = await prisma.moduleContent.findUniqueOrThrow({ where: { id: input.id } });
  await assertSectionOwner(item.contentSectionId, input.unpublishedById);

  return prisma.moduleContent.update({
    where: { id: input.id },
    data: { status: "DRAFT" },
  });
}

// ── addContentAttachment ──────────────────────────────────────────────────────

export async function addContentAttachment(input: { contentItemId: string; addedById: string; fileAssetId: string }) {
  const item = await prisma.moduleContent.findUniqueOrThrow({ where: { id: input.contentItemId } });
  await assertSectionOwner(item.contentSectionId, input.addedById);

  return prisma.contentAttachment.create({
    data: { contentItemId: input.contentItemId, fileAssetId: input.fileAssetId },
  });
}

// ── deleteContentAttachment ───────────────────────────────────────────────────

export async function deleteContentAttachment(input: { attachmentId: string; deletedById: string }) {
  const att = await prisma.contentAttachment.findUniqueOrThrow({
    where: { id: input.attachmentId },
    include: { contentItem: true },
  });
  await assertSectionOwner(att.contentItem.contentSectionId, input.deletedById);

  return prisma.$transaction(async (tx) => {
    await tx.contentAttachment.delete({ where: { id: input.attachmentId } });
    await tx.fileAsset.update({ where: { id: att.fileAssetId }, data: { status: "DELETED" } });
  });
}

// ── listModuleContent ─────────────────────────────────────────────────────────

export type ListModuleContentInput = {
  moduleOfferingId: string;
  viewerId: string;
};

export async function listModuleContent(input: ListModuleContentInput) {
  const viewer = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.viewerId } });

  const isPrivileged =
    viewer.role === "ADMINISTRATOR" ||
    viewer.role === "SUPER_ADMINISTRATOR";

  const isAssignedEducator =
    viewer.role === "EDUCATOR" &&
    (await prisma.moduleOffering.findFirst({
      where: { id: input.moduleOfferingId, primaryEducatorId: viewer.id },
    })) !== null;

  const canSeeAll = isPrivileged || isAssignedEducator;

  if (!canSeeAll) {
    // Student — verify effective module access
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

  return prisma.contentSection.findMany({
    where: { moduleOfferingId: input.moduleOfferingId },
    orderBy: { sortOrder: "asc" },
    include: {
      contentItems: {
        where: canSeeAll ? undefined : { status: "PUBLISHED" },
        orderBy: { sortOrder: "asc" },
        include: { sharedLinks: true, attachments: { include: { fileAsset: true } } },
      },
    },
  });
}
