"use server";

import { redirect } from "next/navigation";
import { requireAuthRedirect } from "@/lib/auth-guard";
import { createClassSession } from "@/lib/class-sessions";

export async function createClassSessionAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ minRole: "ADMINISTRATOR" });
  const moduleOfferingId = formData.get("moduleOfferingId") as string;
  const courseOfferingId = formData.get("courseOfferingId") as string;
  const sessionTypeId = formData.get("sessionTypeId") as string;
  const startAtRaw = formData.get("startAt") as string;
  const finishAtRaw = formData.get("finishAt") as string;
  const sessionLocation = (formData.get("sessionLocation") as string)?.trim() || undefined;

  if (!startAtRaw || !finishAtRaw) return { error: "Start and finish times are required" };

  try {
    await createClassSession({
      moduleOfferingId,
      sessionTypeId,
      startAt: new Date(startAtRaw),
      finishAt: new Date(finishAtRaw),
      sessionLocation,
      attendanceRequired: true,
      createdById: account.id,
    });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/admin/course-offerings/${courseOfferingId}/sessions`);
}
