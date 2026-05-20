"use client";

import { useTransition } from "react";
import { markStudyModeInactiveAction } from "@/lib/actions/catalogue-action";
import Link from "next/link";

type StudyMode = { id: string; name: string; status: string };

export function StudyModeRow({ mode }: { mode: StudyMode }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b">
      <td className="py-2 pr-4">{mode.name}</td>
      <td className="py-2 pr-4">{mode.status === "ACTIVE" ? "Active" : "Inactive"}</td>
      <td className="py-2 space-x-2">
        <Link href={`/admin/catalogue/study-modes/${mode.id}/edit`} className="text-blue-600 underline text-sm">Edit</Link>
        {mode.status === "ACTIVE" && (
          <button
            onClick={() => startTransition(() => markStudyModeInactiveAction(mode.id))}
            disabled={pending}
            className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Mark inactive
          </button>
        )}
      </td>
    </tr>
  );
}
