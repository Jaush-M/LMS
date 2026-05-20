import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { Bell, CheckCircle } from "lucide-react";
import { NotificationActions } from "./notification-actions";
import { EmptyState } from "@/components/ui/empty";
import { Chip } from "@/components/ui/chip";

const SOURCE_TYPE_LABEL: Record<string, string> = {
  ANNOUNCEMENT: "Announcement",
  CONTENT_PUBLISHED: "New content",
  ASSIGNMENT_PUBLISHED: "Assignment",
  MARK_RELEASED: "Mark released",
  CHAT_MENTION: "Mention",
  FINAL_GRADE_RELEASED: "Final grade",
};

const SOURCE_TYPE_CHIP: Record<string, "lav" | "peach" | "sky" | "ok" | "info" | "default"> = {
  ANNOUNCEMENT: "peach",
  CONTENT_PUBLISHED: "sky",
  ASSIGNMENT_PUBLISHED: "lav",
  MARK_RELEASED: "ok",
  CHAT_MENTION: "info",
  FINAL_GRADE_RELEASED: "ok",
};

export default async function StudentNotificationCenterPage() {
  const { account } = await requireAuthPage({ roles: ["STUDENT"] });

  const notifications = await prisma.notification.findMany({
    where: { recipientId: account.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1
            className="text-[22px] font-extrabold tracking-[-0.03em]"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            Notifications
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--ink-3)" }}>
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && <NotificationActions markAllRead />}
      </div>

      {notifications.length === 0 ? (
        <EmptyState title="No notifications" body="You'll see assignment updates, marks, and mentions here." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {notifications.map((n) => {
            const isUnread = !n.readAt;
            const chipVariant = SOURCE_TYPE_CHIP[n.sourceType] ?? "default";
            const label = SOURCE_TYPE_LABEL[n.sourceType] ?? n.sourceType.replace(/_/g, " ");
            return (
              <div
                key={n.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "14px 18px",
                  borderRadius: 14,
                  border: `1px solid ${isUnread ? "var(--primary)" : "var(--line)"}`,
                  background: isUnread ? "var(--primary-softer)" : "var(--surface)",
                  transition: "background 0.15s",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                    background: isUnread ? "var(--primary-soft)" : "var(--surface-2)",
                    color: isUnread ? "var(--primary-deep)" : "var(--ink-4)",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {isUnread ? <Bell size={15} /> : <CheckCircle size={15} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: isUnread ? 700 : 500,
                        color: "var(--ink)",
                      }}
                    >
                      {n.title}
                    </span>
                    <Chip variant={chipVariant} size="sm">{label}</Chip>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>
                    {n.createdAt.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                {isUnread && <NotificationActions notificationId={n.id} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
