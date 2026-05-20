"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openFeedbackPeriod, submitFeedbackResponse } from "@/lib/module-feedback";

async function getAccount() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const account = await prisma.userAccount.findUnique({ where: { userId: session.user.id } });
  if (!account) redirect("/sign-in");
  if (account.mustChangePassword) redirect("/change-password");
  return account;
}

export async function openFeedbackPeriodAction(_prev: unknown, formData: FormData) {
  const account = await getAccount();
  const moduleOfferingId = formData.get("moduleOfferingId") as string;
  const courseOfferingId = formData.get("courseOfferingId") as string;
  const openAtRaw = formData.get("openAt") as string;
  const closeAtRaw = formData.get("closeAt") as string;

  if (!openAtRaw || !closeAtRaw) return { error: "Open and close dates are required" };

  try {
    await openFeedbackPeriod({ moduleOfferingId, openAt: new Date(openAtRaw), closeAt: new Date(closeAtRaw), createdById: account.id });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/administrator/course-offerings/${courseOfferingId}`);
}

export async function submitFeedbackResponseAction(_prev: unknown, formData: FormData) {
  const account = await getAccount();
  const moduleOfferingId = formData.get("moduleOfferingId") as string;
  const ratingRaw = formData.get("rating") as string;
  const comment = (formData.get("comment") as string)?.trim() || undefined;

  const rating = parseInt(ratingRaw, 10);
  if (isNaN(rating) || rating < 1 || rating > 5) return { error: "Rating must be between 1 and 5" };

  try {
    await submitFeedbackResponse({ moduleOfferingId, studentId: account.id, rating, comment });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/student/modules/${moduleOfferingId}/feedback`);
}
