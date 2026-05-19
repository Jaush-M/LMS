"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/session";
import { storeLocalFile } from "@/lib/storage";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value.length > 0 ? value : undefined;
}

function redirectToEducator(
  moduleOfferingId: string | undefined,
  kind: "success" | "error",
  message: string,
): never {
  const params = new URLSearchParams({ [kind]: message });

  if (moduleOfferingId) {
    params.set("moduleOfferingId", moduleOfferingId);
  }

  redirect(`/educator?${params.toString()}`);
}

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function requireEducator() {
  const currentUser = await requireRoles(["EDUCATOR"]);

  if (!currentUser.account.educatorProfile) {
    redirect("/dashboard");
  }

  return currentUser;
}

async function requireOwnedModuleOffering(moduleOfferingId: string) {
  const { account } = await requireEducator();
  const educatorId = account.educatorProfile?.id;

  if (!educatorId) {
    redirect("/dashboard");
  }

  const moduleOffering = await prisma.moduleOffering.findFirst({
    where: {
      id: moduleOfferingId,
      primaryEducatorId: educatorId,
    },
    include: {
      templateModule: { include: { module: true } },
      courseOffering: { include: { course: true } },
    },
  });

  if (!moduleOffering) {
    redirectToEducator(undefined, "error", "Module offering not found.");
  }

  return { account, educatorId, moduleOffering };
}

async function optionalUploadedFile(formData: FormData, key: string) {
  const file = formData.get(key);

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  return file;
}

async function storeFileForDb(file: File, category: "module_content" | "assignment_attachment") {
  const bytes = Buffer.from(await file.arrayBuffer());
  const stored = await storeLocalFile(category, file.name, bytes);

  return {
    ...stored,
    originalFilename: file.name,
    mimeType: file.type || "application/octet-stream",
  };
}

const contentSectionSchema = z.object({
  moduleOfferingId: z.string().min(1),
  title: z.string().min(2).max(120),
});

export async function createContentSection(formData: FormData) {
  const parsed = contentSectionSchema.safeParse({
    moduleOfferingId: text(formData, "moduleOfferingId"),
    title: text(formData, "title"),
  });

  if (!parsed.success) {
    redirectToEducator(undefined, "error", "Content section title is required.");
  }

  const { account } = await requireOwnedModuleOffering(parsed.data.moduleOfferingId);

  const lastSection = await prisma.contentSection.findFirst({
    where: { moduleOfferingId: parsed.data.moduleOfferingId },
    orderBy: { sortOrder: "desc" },
  });

  const section = await prisma.contentSection.create({
    data: {
      moduleOfferingId: parsed.data.moduleOfferingId,
      title: parsed.data.title,
      sortOrder: (lastSection?.sortOrder ?? 0) + 1,
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      eventType: "OPERATIONAL",
      action: "content_section.created",
      actorId: account.id,
      entityType: "ContentSection",
      entityId: section.id,
      afterJson: parsed.data,
    },
  });

  revalidatePath("/educator");
  redirectToEducator(parsed.data.moduleOfferingId, "success", "Content section created.");
}

const contentItemSchema = z.object({
  moduleOfferingId: z.string().min(1),
  contentSectionId: z.string().min(1),
  title: z.string().min(2).max(160),
  bodyRichText: z.string().optional(),
  visibility: z.enum(["DRAFT", "PUBLISHED"]),
  linkUrl: z.string().url().optional(),
  linkLabel: z.string().max(120).optional(),
});

export async function createContentItem(formData: FormData) {
  const parsed = contentItemSchema.safeParse({
    moduleOfferingId: text(formData, "moduleOfferingId"),
    contentSectionId: text(formData, "contentSectionId"),
    title: text(formData, "title"),
    bodyRichText: optionalText(formData, "bodyRichText"),
    visibility: text(formData, "visibility"),
    linkUrl: optionalText(formData, "linkUrl"),
    linkLabel: optionalText(formData, "linkLabel"),
  });

  if (!parsed.success) {
    redirectToEducator(undefined, "error", "Content item details are incomplete.");
  }

  const { account } = await requireOwnedModuleOffering(parsed.data.moduleOfferingId);
  const section = await prisma.contentSection.findFirst({
    where: {
      id: parsed.data.contentSectionId,
      moduleOfferingId: parsed.data.moduleOfferingId,
    },
  });

  if (!section) {
    redirectToEducator(parsed.data.moduleOfferingId, "error", "Selected section does not belong to this module.");
  }

  const uploadedFile = await optionalUploadedFile(formData, "file");
  const storedFile = uploadedFile
    ? await storeFileForDb(uploadedFile, "module_content")
    : null;

  const lastItem = await prisma.moduleContentItem.findFirst({
    where: { contentSectionId: parsed.data.contentSectionId },
    orderBy: { sortOrder: "desc" },
  });

  const contentItem = await prisma.moduleContentItem.create({
    data: {
      moduleOfferingId: parsed.data.moduleOfferingId,
      contentSectionId: parsed.data.contentSectionId,
      title: parsed.data.title,
      bodyRichText: parsed.data.bodyRichText,
      visibility: parsed.data.visibility,
      sortOrder: (lastItem?.sortOrder ?? 0) + 1,
      publishedAt: parsed.data.visibility === "PUBLISHED" ? new Date() : null,
      sharedLinks: parsed.data.linkUrl
        ? {
            create: {
              url: parsed.data.linkUrl,
              label: parsed.data.linkLabel,
              createdById: account.id,
            },
          }
        : undefined,
      fileAssets: storedFile
        ? {
            create: {
              storageDriver: storedFile.storageDriver,
              storageKey: storedFile.storageKey,
              originalFilename: storedFile.originalFilename,
              mimeType: storedFile.mimeType,
              sizeBytes: storedFile.sizeBytes,
              category: "MODULE_CONTENT",
              uploadedById: account.id,
            },
          }
        : undefined,
    },
  });

  if (parsed.data.visibility === "PUBLISHED") {
    const enrolments = await prisma.enrolment.findMany({
      where: {
        status: "ACTIVE",
        courseOffering: {
          moduleOfferings: { some: { id: parsed.data.moduleOfferingId } },
        },
      },
      select: { student: { select: { userAccountId: true } } },
    });

    await prisma.notification.createMany({
      data: enrolments.map((enrolment) => ({
        recipientId: enrolment.student.userAccountId,
        type: "PUBLISHED_CONTENT",
        title: "New module content",
        body: parsed.data.title,
        relatedEntityType: "ModuleContentItem",
        relatedEntityId: contentItem.id,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.auditLogEntry.create({
    data: {
      eventType: "OPERATIONAL",
      action: "module_content.created",
      actorId: account.id,
      entityType: "ModuleContentItem",
      entityId: contentItem.id,
      afterJson: {
        title: parsed.data.title,
        visibility: parsed.data.visibility,
        hasFile: Boolean(storedFile),
        hasLink: Boolean(parsed.data.linkUrl),
      },
    },
  });

  revalidatePath("/educator");
  revalidatePath("/dashboard");
  redirectToEducator(parsed.data.moduleOfferingId, "success", "Module content saved.");
}

const componentSchema = z.object({
  moduleOfferingId: z.string().min(1),
  title: z.string().min(2).max(160),
  type: z.enum(["ONLINE_ASSIGNMENT", "OFFLINE_ASSESSMENT"]),
  weightPercent: z.coerce.number().min(0.01).max(100),
  maximumMark: z.coerce.number().min(1).max(999),
});

export async function createAssessmentComponent(formData: FormData) {
  const parsed = componentSchema.safeParse({
    moduleOfferingId: text(formData, "moduleOfferingId"),
    title: text(formData, "title"),
    type: text(formData, "type"),
    weightPercent: text(formData, "weightPercent"),
    maximumMark: text(formData, "maximumMark"),
  });

  if (!parsed.success) {
    redirectToEducator(undefined, "error", "Assessment component details are incomplete.");
  }

  const { account } = await requireOwnedModuleOffering(parsed.data.moduleOfferingId);
  const existing = await prisma.assessmentComponent.findMany({
    where: { moduleOfferingId: parsed.data.moduleOfferingId },
    orderBy: { sortOrder: "asc" },
  });
  const currentTotal = existing.reduce(
    (sum, component) => sum + Number(component.weightPercent),
    0,
  );

  if (currentTotal + parsed.data.weightPercent > 100) {
    redirectToEducator(parsed.data.moduleOfferingId, "error", "Assessment weights cannot exceed 100%.");
  }

  const component = await prisma.assessmentComponent.create({
    data: {
      moduleOfferingId: parsed.data.moduleOfferingId,
      title: parsed.data.title,
      type: parsed.data.type,
      weightPercent: parsed.data.weightPercent,
      maximumMark: parsed.data.maximumMark,
      sortOrder: (existing.at(-1)?.sortOrder ?? 0) + 1,
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      eventType: "OPERATIONAL",
      action: "assessment_component.created",
      actorId: account.id,
      entityType: "AssessmentComponent",
      entityId: component.id,
      afterJson: parsed.data,
    },
  });

  revalidatePath("/educator");
  redirectToEducator(parsed.data.moduleOfferingId, "success", "Assessment component created.");
}

const assignmentSchema = z.object({
  moduleOfferingId: z.string().min(1),
  contentSectionId: z.string().optional(),
  assessmentComponentId: z.string().optional(),
  title: z.string().min(2).max(160),
  instructionsRichText: z.string().optional(),
  deadlineAt: z.string().min(1),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  weightPercent: z.coerce.number().min(0.01).max(100).optional(),
  maximumMark: z.coerce.number().min(1).max(999).optional(),
});

export async function createAssignment(formData: FormData) {
  const parsed = assignmentSchema.safeParse({
    moduleOfferingId: text(formData, "moduleOfferingId"),
    contentSectionId: optionalText(formData, "contentSectionId"),
    assessmentComponentId: optionalText(formData, "assessmentComponentId"),
    title: text(formData, "title"),
    instructionsRichText: optionalText(formData, "instructionsRichText"),
    deadlineAt: text(formData, "deadlineAt"),
    status: text(formData, "status"),
    weightPercent: optionalText(formData, "weightPercent"),
    maximumMark: optionalText(formData, "maximumMark"),
  });

  if (!parsed.success) {
    redirectToEducator(undefined, "error", "Assignment details are incomplete.");
  }

  const deadlineAt = parseDate(parsed.data.deadlineAt);

  if (!deadlineAt) {
    redirectToEducator(parsed.data.moduleOfferingId, "error", "Assignment deadline is invalid.");
  }

  const { account } = await requireOwnedModuleOffering(parsed.data.moduleOfferingId);

  if (parsed.data.contentSectionId) {
    const section = await prisma.contentSection.findFirst({
      where: {
        id: parsed.data.contentSectionId,
        moduleOfferingId: parsed.data.moduleOfferingId,
      },
    });

    if (!section) {
      redirectToEducator(parsed.data.moduleOfferingId, "error", "Selected section does not belong to this module.");
    }
  }

  const uploadedFile = await optionalUploadedFile(formData, "file");
  const storedFile = uploadedFile
    ? await storeFileForDb(uploadedFile, "assignment_attachment")
    : null;

  try {
    const assignment = await prisma.$transaction(async (tx) => {
      let assessmentComponentId = parsed.data.assessmentComponentId;

      if (assessmentComponentId) {
        const component = await tx.assessmentComponent.findFirst({
          where: {
            id: assessmentComponentId,
            moduleOfferingId: parsed.data.moduleOfferingId,
            type: "ONLINE_ASSIGNMENT",
            assignment: null,
          },
        });

        if (!component) {
          throw new Error("Invalid assessment component.");
        }
      } else {
        const existingComponents = await tx.assessmentComponent.findMany({
          where: { moduleOfferingId: parsed.data.moduleOfferingId },
          orderBy: { sortOrder: "asc" },
        });
        const currentTotal = existingComponents.reduce(
          (sum, component) => sum + Number(component.weightPercent),
          0,
        );
        const weightPercent = parsed.data.weightPercent ?? 10;

        if (currentTotal + weightPercent > 100) {
          throw new Error("Assessment weights exceed 100%.");
        }

        const component = await tx.assessmentComponent.create({
          data: {
            moduleOfferingId: parsed.data.moduleOfferingId,
            title: parsed.data.title,
            type: "ONLINE_ASSIGNMENT",
            weightPercent,
            maximumMark: parsed.data.maximumMark ?? 100,
            sortOrder: (existingComponents.at(-1)?.sortOrder ?? 0) + 1,
          },
        });
        assessmentComponentId = component.id;
      }

      return tx.assignment.create({
        data: {
          moduleOfferingId: parsed.data.moduleOfferingId,
          assessmentComponentId,
          contentSectionId: parsed.data.contentSectionId,
          title: parsed.data.title,
          instructionsRichText: parsed.data.instructionsRichText,
          deadlineAt,
          status: parsed.data.status,
          publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
          fileAssets: storedFile
            ? {
                create: {
                  storageDriver: storedFile.storageDriver,
                  storageKey: storedFile.storageKey,
                  originalFilename: storedFile.originalFilename,
                  mimeType: storedFile.mimeType,
                  sizeBytes: storedFile.sizeBytes,
                  category: "ASSIGNMENT_ATTACHMENT",
                  uploadedById: account.id,
                },
              }
            : undefined,
        },
      });
    });

    if (parsed.data.status === "PUBLISHED") {
      const reminderDays = await prisma.systemSetting.findUnique({
        where: { key: "defaultReminderPeriodDays" },
      });
      const days =
        typeof reminderDays?.valueJson === "number"
          ? reminderDays.valueJson
          : 15;
      const reminderAt = new Date(deadlineAt);
      reminderAt.setDate(reminderAt.getDate() - days);

      const enrolments = await prisma.enrolment.findMany({
        where: {
          status: "ACTIVE",
          courseOffering: {
            moduleOfferings: { some: { id: parsed.data.moduleOfferingId } },
          },
        },
        select: { student: { select: { userAccountId: true } } },
      });

      await prisma.notification.createMany({
        data: enrolments.map((enrolment) => ({
          recipientId: enrolment.student.userAccountId,
          type: "ASSIGNMENT_REMINDER",
          title: "Assignment due",
          body: `${parsed.data.title} reminder starts ${reminderAt.toLocaleDateString("en-MV")}`,
          relatedEntityType: "Assignment",
          relatedEntityId: assignment.id,
        })),
      });
    }

    await prisma.auditLogEntry.create({
      data: {
        eventType: "OPERATIONAL",
        action: "assignment.created",
        actorId: account.id,
        entityType: "Assignment",
        entityId: assignment.id,
        afterJson: {
          title: parsed.data.title,
          status: parsed.data.status,
          deadlineAt,
          hasFile: Boolean(storedFile),
        },
      },
    });
  } catch {
    redirectToEducator(parsed.data.moduleOfferingId, "error", "Assignment could not be created. Check component and weights.");
  }

  revalidatePath("/educator");
  revalidatePath("/dashboard");
  redirectToEducator(parsed.data.moduleOfferingId, "success", "Assignment created.");
}

const deadlineExtensionSchema = z.object({
  assignmentId: z.string().min(1),
  moduleOfferingId: z.string().min(1),
  newDeadlineAt: z.string().min(1),
  reason: z.string().min(3).max(500),
});

export async function extendAssignmentDeadline(formData: FormData) {
  const parsed = deadlineExtensionSchema.safeParse({
    assignmentId: text(formData, "assignmentId"),
    moduleOfferingId: text(formData, "moduleOfferingId"),
    newDeadlineAt: text(formData, "newDeadlineAt"),
    reason: text(formData, "reason"),
  });

  if (!parsed.success) {
    redirectToEducator(undefined, "error", "Deadline extension details are incomplete.");
  }

  const newDeadlineAt = parseDate(parsed.data.newDeadlineAt);
  if (!newDeadlineAt) {
    redirectToEducator(parsed.data.moduleOfferingId, "error", "New deadline is invalid.");
  }

  const { account } = await requireOwnedModuleOffering(parsed.data.moduleOfferingId);
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: parsed.data.assignmentId,
      moduleOfferingId: parsed.data.moduleOfferingId,
    },
  });

  if (!assignment) {
    redirectToEducator(parsed.data.moduleOfferingId, "error", "Assignment not found.");
  }

  await prisma.$transaction([
    prisma.assignmentDeadlineExtension.create({
      data: {
        assignmentId: assignment.id,
        oldDeadlineAt: assignment.deadlineAt,
        newDeadlineAt,
        reason: parsed.data.reason,
        createdById: account.id,
      },
    }),
    prisma.assignment.update({
      where: { id: assignment.id },
      data: { deadlineAt: newDeadlineAt },
    }),
    prisma.auditLogEntry.create({
      data: {
        eventType: "OPERATIONAL",
        action: "assignment_deadline.extended",
        actorId: account.id,
        entityType: "Assignment",
        entityId: assignment.id,
        beforeJson: { deadlineAt: assignment.deadlineAt },
        afterJson: { deadlineAt: newDeadlineAt },
        reason: parsed.data.reason,
      },
    }),
  ]);

  const enrolments = await prisma.enrolment.findMany({
    where: {
      status: "ACTIVE",
      courseOffering: {
        moduleOfferings: { some: { id: parsed.data.moduleOfferingId } },
      },
    },
    select: { student: { select: { userAccountId: true } } },
  });

  await prisma.notification.createMany({
    data: enrolments.map((enrolment) => ({
      recipientId: enrolment.student.userAccountId,
      type: "ASSIGNMENT_DEADLINE_EXTENSION",
      title: "Assignment deadline extended",
      body: assignment.title,
      relatedEntityType: "Assignment",
      relatedEntityId: assignment.id,
    })),
  });

  revalidatePath("/educator");
  revalidatePath("/dashboard");
  redirectToEducator(parsed.data.moduleOfferingId, "success", "Deadline extension applied.");
}

const attendanceStatuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

const attendanceSchema = z.object({
  moduleOfferingId: z.string().min(1),
  classSessionId: z.string().min(1),
});

export async function markAttendance(formData: FormData) {
  const parsed = attendanceSchema.safeParse({
    moduleOfferingId: text(formData, "moduleOfferingId"),
    classSessionId: text(formData, "classSessionId"),
  });

  if (!parsed.success) {
    redirectToEducator(undefined, "error", "Attendance session is missing.");
  }

  const { account, educatorId } = await requireOwnedModuleOffering(
    parsed.data.moduleOfferingId,
  );
  const classSession = await prisma.classSession.findFirst({
    where: {
      id: parsed.data.classSessionId,
      moduleOfferingId: parsed.data.moduleOfferingId,
      isAttendanceRequired: true,
    },
  });

  if (!classSession) {
    redirectToEducator(parsed.data.moduleOfferingId, "error", "Class session not found.");
  }

  const enrolments = await prisma.enrolment.findMany({
    where: {
      status: "ACTIVE",
      courseOffering: {
        moduleOfferings: { some: { id: parsed.data.moduleOfferingId } },
      },
    },
    include: {
      student: true,
      moduleExceptions: {
        where: {
          moduleOfferingId: parsed.data.moduleOfferingId,
          type: "EXCLUDE",
        },
      },
    },
  });

  const eligibleEnrolments = enrolments.filter(
    (enrolment) => enrolment.moduleExceptions.length === 0,
  );

  await prisma.$transaction(async (tx) => {
    for (const enrolment of eligibleEnrolments) {
      const rawStatus = text(formData, `student_${enrolment.studentId}`);
      const status = attendanceStatuses.includes(
        rawStatus as (typeof attendanceStatuses)[number],
      )
        ? (rawStatus as (typeof attendanceStatuses)[number])
        : "ABSENT";

      await tx.attendanceRecord.upsert({
        where: {
          classSessionId_studentId: {
            classSessionId: parsed.data.classSessionId,
            studentId: enrolment.studentId,
          },
        },
        update: {
          status,
          submittedById: account.id,
          submittedAt: new Date(),
        },
        create: {
          classSessionId: parsed.data.classSessionId,
          studentId: enrolment.studentId,
          status,
          submittedById: account.id,
        },
      });
    }

    await tx.educatorAttendanceRecord.upsert({
      where: { classSessionId: parsed.data.classSessionId },
      update: {
        educatorId,
        submittedAttendanceAt: new Date(),
      },
      create: {
        classSessionId: parsed.data.classSessionId,
        educatorId,
      },
    });

    await tx.auditLogEntry.create({
      data: {
        eventType: "OPERATIONAL",
        action: "attendance.marked",
        actorId: account.id,
        entityType: "ClassSession",
        entityId: parsed.data.classSessionId,
        afterJson: {
          moduleOfferingId: parsed.data.moduleOfferingId,
          studentCount: eligibleEnrolments.length,
        },
      },
    });
  });

  revalidatePath("/educator");
  revalidatePath("/dashboard");
  redirectToEducator(parsed.data.moduleOfferingId, "success", "Attendance saved.");
}
