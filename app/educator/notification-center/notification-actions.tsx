"use client";

import { useActionState } from "react";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/lib/actions/notification-action";

type Props =
  | { notificationId: string; markAllRead?: never }
  | { markAllRead: true; notificationId?: never };

export function NotificationActions({ notificationId, markAllRead }: Props) {
  const [, action, pending] = useActionState(
    markAllRead ? markAllNotificationsReadAction : markNotificationReadAction,
    null
  );

  return (
    <form action={action}>
      {notificationId && <input type="hidden" name="notificationId" value={notificationId} />}
      <button
        type="submit"
        disabled={pending}
        style={{
          padding: "4px 10px",
          borderRadius: 8,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          color: "var(--ink-2)",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          opacity: pending ? 0.5 : 1,
          whiteSpace: "nowrap",
        }}
      >
        {pending ? "…" : markAllRead ? "Mark all read" : "Mark read"}
      </button>
    </form>
  );
}
