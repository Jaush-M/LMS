"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { updateSystemSettings } from "@/lib/system-settings";

export type SystemSettingsState = { error?: string; success?: boolean } | null;

export async function updateSystemSettingsAction(
  _prev: SystemSettingsState,
  formData: FormData
): Promise<SystemSettingsState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { id: true, role: true },
  });
  if (!actor || actor.role !== "SUPER_ADMINISTRATOR") return { error: "Unauthorized" };

  const updates = {
    defaultReminderPeriodDays: parseInt(formData.get("defaultReminderPeriodDays") as string),
    attendanceCorrectionWindowDays: parseInt(
      formData.get("attendanceCorrectionWindowDays") as string
    ),
    passThresholdPercent: parseFloat(formData.get("passThresholdPercent") as string),
    attendanceRiskThresholdPercent: parseFloat(
      formData.get("attendanceRiskThresholdPercent") as string
    ),
    postCourseMarkingWindowDays: parseInt(formData.get("postCourseMarkingWindowDays") as string),
    maxUploadBytesChatAttachment: parseInt(
      formData.get("maxUploadBytesChatAttachment") as string
    ),
    maxUploadBytesSubmission: parseInt(formData.get("maxUploadBytesSubmission") as string),
    maxUploadBytesContentAttachment: parseInt(
      formData.get("maxUploadBytesContentAttachment") as string
    ),
    maxUploadBytesAnnouncementAttachment: parseInt(
      formData.get("maxUploadBytesAnnouncementAttachment") as string
    ),
  };

  await updateSystemSettings(actor.id, updates);
  revalidatePath("/admin/system-settings");
  return { success: true };
}
