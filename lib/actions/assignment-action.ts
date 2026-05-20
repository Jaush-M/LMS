"use server";

import { redirect } from "next/navigation";
import { requireAuthRedirect } from "@/lib/auth-guard";
import { createAssignment, publishAssignment, unpublishAssignment, extendDeadline } from "@/lib/assignments";

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
