"use server";

import { redirect } from "next/navigation";
import { requireAuthRedirect } from "@/lib/auth-guard";
import { createAssignment, publishAssignment, unpublishAssignment, extendDeadline, submitAssignment, deleteSubmission, requestDeadlineExtension } from "@/lib/assignments";
import { uploadFile } from "@/lib/storage/upload-file";
import { LocalDiskDriver } from "@/lib/storage/local-driver";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export async function createAssignmentAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ roles: ["EDUCATOR"] });
  const moduleOfferingId = formData.get("moduleOfferingId") as string;
  const title = (formData.get("title") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();
  const deadlineRaw = formData.get("deadline") as string;
  const maximumMarkRaw = formData.get("maximumMark") as string;

  if (!title) return { error: "Title is required" };
  if (!deadlineRaw) return { error: "Deadline is required" };
  const maximumMark = parseFloat(maximumMarkRaw);
  if (isNaN(maximumMark) || maximumMark <= 0) return { error: "Maximum mark must be a positive number" };

  try {
    await createAssignment({
      moduleOfferingId,
      createdById: account.id,
      title,
      body: body || "",
      deadline: new Date(deadlineRaw),
      maximumMark,
    });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/educator/modules/${moduleOfferingId}/assignments`);
}

export async function publishAssignmentAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ roles: ["EDUCATOR"] });
  const id = formData.get("id") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;

  try {
    await publishAssignment({ id, publishedById: account.id });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/educator/modules/${moduleOfferingId}/assignments`);
}

export async function unpublishAssignmentAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ roles: ["EDUCATOR"] });
  const id = formData.get("id") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;

  try {
    await unpublishAssignment({ id, unpublishedById: account.id });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/educator/modules/${moduleOfferingId}/assignments`);
}

export async function submitAssignmentAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ roles: ["STUDENT"] });
  const assignmentId = formData.get("assignmentId") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) return { error: "Please select a file" };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `submissions/${account.id}/${assignmentId}/${Date.now()}_${safeName}`;
    const driver = new LocalDiskDriver(env.LOCAL_STORAGE_PATH, env.BETTER_AUTH_URL);
    const asset = await uploadFile(
      { buffer, key, originalFilename: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, category: "SUBMISSION", uploadedById: account.id },
      driver,
      prisma
    );
    await submitAssignment({ assignmentId, studentId: account.id, fileAssetId: asset.id });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/student/modules/${moduleOfferingId}/assignments`);
}

export async function deleteSubmissionAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ roles: ["STUDENT"] });
  const submissionId = formData.get("submissionId") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;

  try {
    await deleteSubmission({ submissionId, studentId: account.id });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/student/modules/${moduleOfferingId}/assignments`);
}

export async function requestDeadlineExtensionAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ roles: ["STUDENT"] });
  const assignmentId = formData.get("assignmentId") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;
  const reason = (formData.get("reason") as string)?.trim();

  if (!reason) return { error: "Please provide a reason" };

  try {
    await requestDeadlineExtension({ assignmentId, requestedById: account.id, reason });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/student/modules/${moduleOfferingId}/assignments`);
}

export async function extendDeadlineAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ roles: ["EDUCATOR"] });
  const assignmentId = formData.get("assignmentId") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;
  const newDeadlineRaw = formData.get("newDeadline") as string;
  const reason = (formData.get("reason") as string)?.trim();

  if (!newDeadlineRaw) return { error: "New deadline is required" };
  if (!reason) return { error: "Reason is required" };

  try {
    await extendDeadline({ assignmentId, extendedById: account.id, newDeadline: new Date(newDeadlineRaw), reason });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/educator/modules/${moduleOfferingId}/assignments/${assignmentId}`);
}
