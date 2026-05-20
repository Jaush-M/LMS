import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NotificationActions } from "./notification-actions";

export default async function EducatorNotificationCenterPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { id: true, role: true, mustChangePassword: true },
  });
  if (!actor || actor.role !== "EDUCATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const notifications = await prisma.notification.findMany({
    where: { recipientId: actor.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      announcement: { select: { body: true } },
      moduleContent: { select: { title: true } },
      assignment: { select: { title: true } },
      componentMark: { select: { score: true } },
      chatMessage: { select: { body: true } },
    },
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <main className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Notification Center</h1>
          {unreadCount > 0 && <p className="text-sm text-gray-500 mt-1">{unreadCount} unread</p>}
        </div>
        <div className="flex gap-3">
          {unreadCount > 0 && <NotificationActions markAllRead />}
          <Link href="/educator/dashboard" className="text-sm text-blue-600 underline self-center">Dashboard</Link>
        </div>
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-gray-500">No notifications yet.</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id} className={`rounded border px-5 py-4 ${n.readAt ? "border-gray-200 bg-white" : "border-blue-200 bg-blue-50"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {n.sourceType.replace("_", " ")} · {n.createdAt.toLocaleDateString()}
                  </p>
                </div>
                {!n.readAt && <NotificationActions notificationId={n.id} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
