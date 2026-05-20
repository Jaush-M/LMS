"use server";

import { redirect } from "next/navigation";
import { requireAuthRedirect } from "@/lib/auth-guard";
import { submitAttendance } from "@/lib/attendance";

export async function submitAttendanceAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ roles: ["EDUCATOR"] });
  const classSessionId = formData.get("classSessionId") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;

  const studentIds = formData.getAll("studentId") as string[];
  const attendanceEntries = studentIds.map((studentId) => ({
    studentId,
    status: (formData.get(`status_${studentId}`) as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED") ?? "ABSENT",
  }));

  try {
    await submitAttendance({
      classSessionId,
      educatorId: account.id,
      submittedAt: new Date(),
      attendanceEntries,
    });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/educator/modules/${moduleOfferingId}/sessions`);
}
