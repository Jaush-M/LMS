"use server";

import { redirect } from "next/navigation";
import { requireAuthRedirect } from "@/lib/auth-guard";
import { openFeedbackPeriod, submitFeedbackResponse } from "@/lib/module-feedback";

export async function openFeedbackPeriodAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ minRole: "ADMINISTRATOR" });
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
  redirect(`/admin/course-offerings/${courseOfferingId}`);
}

export async function submitFeedbackResponseAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ roles: ["STUDENT"] });
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
