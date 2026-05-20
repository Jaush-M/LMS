"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClassSession } from "@/lib/class-sessions";

async function getAdminAccount() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const account = await prisma.userAccount.findUnique({ where: { userId: session.user.id } });
  if (!account || account.role !== "ADMINISTRATOR") redirect("/dashboard");
  if (account.mustChangePassword) redirect("/change-password");
  return account;
}

export async function createClassSessionAction(_prev: unknown, formData: FormData) {
  const account = await getAdminAccount();
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
  redirect(`/administrator/course-offerings/${courseOfferingId}/sessions`);
}
