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

function redirectToStudent(
  moduleOfferingId: string | undefined,
  kind: "success" | "error",
  message: string,
): never {
  const params = new URLSearchParams({ [kind]: message });

  if (moduleOfferingId) {
    params.set("moduleOfferingId", moduleOfferingId);
  }

  redirect(`/student?${params.toString()}`);
}

async function requireStudent() {
  const currentUser = await requireRoles(["STUDENT"]);

  if (!currentUser.account.studentProfile) {
    redirect("/dashboard");
  }

  return currentUser;
}

async function requireStudentModule(studentId: string, moduleOfferingId: string) {
  const enrolment = await prisma.enrolment.findFirst({
    where: {
      studentId,
      status: "ACTIVE",
      courseOffering: {
        moduleOfferings: { some: { id: moduleOfferingId } },
      },
    },
    include: {
      moduleExceptions: {
        where: { moduleOfferingId },
      },
    },
  });

  if (!enrolment) {
    redirectToStudent(undefined, "error", "Module is not available to this student.");
  }

  const excluded = enrolment.moduleExceptions.some(
    (exception) => exception.type === "EXCLUDE",
  );

  if (excluded) {
    redirectToStudent(undefined, "error", "Module is excluded for this student.");
  }

  return enrolment;
}

async function getRequiredFile(formData: FormData) {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirectToStudent(undefined, "error", "Submission file is required.");
  }

  return file;
}

const submissionSchema = z.object({
  moduleOfferingId: z.string().min(1),
  assignmentId: z.string().min(1),
});

export async function submitAssignment(formData: FormData) {
  const { account } = await requireStudent();
  const studentId = account.studentProfile?.id;

  if (!studentId) {
    redirect("/dashboard");
  }

  const parsed = submissionSchema.safeParse({
    moduleOfferingId: text(formData, "moduleOfferingId"),
    assignmentId: text(formData, "assignmentId"),
  });

  if (!parsed.success) {
    redirectToStudent(undefined, "error", "Submission details are incomplete.");
  }

  await requireStudentModule(studentId, parsed.data.moduleOfferingId);

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: parsed.data.assignmentId,
      moduleOfferingId: parsed.data.moduleOfferingId,
      status: "PUBLISHED",
    },
    include: {
      submissions: {
        where: { studentId, isActive: true },
        include: { componentMark: true },
        take: 1,
      },
    },
  });

  if (!assignment) {
    redirectToStudent(parsed.data.moduleOfferingId, "error", "Assignment not found.");
  }

  const activeSubmission = assignment.submissions[0];

  if (
    activeSubmission &&
    (activeSubmission.status === "MARKED" || activeSubmission.componentMark)
  ) {
    redirectToStudent(parsed.data.moduleOfferingId, "error", "Marked submissions cannot be replaced.");
  }

  const file = await getRequiredFile(formData);
  const bytes = Buffer.from(await file.arrayBuffer());
  const stored = await storeLocalFile("assignment_submission", file.name, bytes);
  const now = new Date();
  const status = now > assignment.deadlineAt ? "LATE" : "SUBMITTED";

  const submission = await prisma.$transaction(async (tx) => {
    if (activeSubmission) {
      await tx.submission.update({
        where: { id: activeSubmission.id },
        data: { isActive: false },
      });
    }

    return tx.submission.create({
      data: {
        assignmentId: assignment.id,
        studentId,
        submittedAt: now,
        status,
        isActive: true,
        fileAssets: {
          create: {
            storageDriver: stored.storageDriver,
            storageKey: stored.storageKey,
            originalFilename: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: stored.sizeBytes,
            category: "ASSIGNMENT_SUBMISSION",
            uploadedById: account.id,
          },
        },
      },
    });
  });

  await prisma.auditLogEntry.create({
    data: {
      eventType: "OPERATIONAL",
      action: activeSubmission
        ? "assignment_submission.replaced"
        : "assignment_submission.created",
      actorId: account.id,
      entityType: "Submission",
      entityId: submission.id,
      afterJson: {
        assignmentId: assignment.id,
        status,
        originalFilename: file.name,
      },
    },
  });

  revalidatePath("/student");
  revalidatePath("/dashboard");
  redirectToStudent(parsed.data.moduleOfferingId, "success", "Assignment submitted.");
}
