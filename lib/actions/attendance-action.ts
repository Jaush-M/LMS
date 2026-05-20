"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submitAttendance } from "@/lib/attendance";

async function getEducatorAccount() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const account = await prisma.userAccount.findUnique({ where: { userId: session.user.id } });
  if (!account || account.role !== "EDUCATOR") redirect("/dashboard");
  if (account.mustChangePassword) redirect("/change-password");
  return account;
}

export async function submitAttendanceAction(_prev: unknown, formData: FormData) {
  const account = await getEducatorAccount();
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
