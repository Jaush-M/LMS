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
        className="rounded border px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50 whitespace-nowrap"
      >
        {pending ? "…" : markAllRead ? "Mark all read" : "Mark read"}
      </button>
    </form>
  );
}
