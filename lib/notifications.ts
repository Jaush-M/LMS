import { prisma } from "./prisma";

export async function listNotifications(recipientId: string) {
  return prisma.notification.findMany({
    where: { recipientId },
    orderBy: { createdAt: "desc" },
  });
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findUniqueOrThrow({ where: { id: notificationId } });
  if (notification.recipientId !== userId) {
    throw new Error("Permission denied: only the notification recipient may mark it as read");
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(recipientId: string) {
  return prisma.notification.updateMany({
    where: { recipientId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function updateStudentReminderPeriod(userAccountId: string, days: number) {
  const account = await prisma.userAccount.findUniqueOrThrow({ where: { id: userAccountId } });
  if (account.role !== "STUDENT") {
    throw new Error("Only Students may customise their Reminder Period");
  }
  return prisma.userAccount.update({
    where: { id: userAccountId },
    data: { reminderPeriodDays: days },
  });
}
