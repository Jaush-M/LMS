"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuthRedirect } from "@/lib/auth-guard";

export async function markNotificationReadAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect();
  const notificationId = formData.get("notificationId") as string;

  await prisma.notification.updateMany({
    where: { id: notificationId, recipientId: account.id },
    data: { readAt: new Date() },
  });

  redirect(account.role === "EDUCATOR" ? "/educator/notification-center" : "/student/notification-center");
}

export async function markAllNotificationsReadAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect();
  void formData;

  await prisma.notification.updateMany({
    where: { recipientId: account.id, readAt: null },
    data: { readAt: new Date() },
  });

  redirect(account.role === "EDUCATOR" ? "/educator/notification-center" : "/student/notification-center");
}
