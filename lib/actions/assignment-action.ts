"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAssignment, publishAssignment, unpublishAssignment, extendDeadline } from "@/lib/assignments";

async function getEducatorAccount() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const account = await prisma.userAccount.findUnique({ where: { userId: session.user.id } });
  if (!account || account.role !== "EDUCATOR") redirect("/dashboard");
  if (account.mustChangePassword) redirect("/change-password");
  return account;
}

export async function createAssignmentAction(_prev: unknown, formData: FormData) {
  const account = await getEducatorAccount();
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
  const account = await getEducatorAccount();
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
  const account = await getEducatorAccount();
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
  const account = await getEducatorAccount();
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
