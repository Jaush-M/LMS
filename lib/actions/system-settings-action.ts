"use server";

import { revalidatePath } from "next/cache";
import { requireAuthAction } from "@/lib/auth-guard";
import { updateSystemSettings } from "@/lib/system-settings";

export type SystemSettingsState = { error?: string; success?: boolean } | null;

export async function updateSystemSettingsAction(
  _prev: SystemSettingsState,
  formData: FormData
): Promise<SystemSettingsState> {
  const { account } = await requireAuthAction({ roles: ["SUPER_ADMINISTRATOR"] });

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

  await updateSystemSettings(account.id, updates);
  revalidatePath("/admin/system-settings");
  return { success: true };
}
