"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getAccount() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const account = await prisma.userAccount.findUnique({ where: { userId: session.user.id } });
  if (!account) redirect("/sign-in");
  if (account.mustChangePassword) redirect("/change-password");
  return account;
}

export async function markNotificationReadAction(_prev: unknown, formData: FormData) {
  const account = await getAccount();
  const notificationId = formData.get("notificationId") as string;

  await prisma.notification.updateMany({
    where: { id: notificationId, recipientId: account.id },
    data: { readAt: new Date() },
  });

  const role = account.role;
  const basePath = role === "EDUCATOR" ? "/educator/notification-center" : "/student/notification-center";
  redirect(basePath);
}

export async function markAllNotificationsReadAction(_prev: unknown, formData: FormData) {
  const account = await getAccount();
  void formData;

  await prisma.notification.updateMany({
    where: { recipientId: account.id, readAt: null },
    data: { readAt: new Date() },
  });

  const role = account.role;
  const basePath = role === "EDUCATOR" ? "/educator/notification-center" : "/student/notification-center";
  redirect(basePath);
}
