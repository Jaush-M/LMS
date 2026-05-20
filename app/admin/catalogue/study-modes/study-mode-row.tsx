"use client";

import { useTransition } from "react";
import { markStudyModeInactiveAction } from "@/lib/actions/catalogue-action";
import Link from "next/link";
import { Chip } from "@/components/ui/chip";

type StudyMode = { id: string; name: string; status: string };

export function StudyModeRow({ mode }: { mode: StudyMode }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
      <td style={{ padding: "10px 18px", fontWeight: 600, color: "var(--ink)" }}>{mode.name}</td>
      <td style={{ padding: "10px 8px" }}>
        <Chip variant={mode.status === "ACTIVE" ? "ok" : "default"} size="sm">{mode.status === "ACTIVE" ? "Active" : "Inactive"}</Chip>
      </td>
      <td style={{ padding: "10px 18px 10px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href={`/admin/catalogue/study-modes/${mode.id}/edit`} style={{ fontSize: 13, fontWeight: 600, color: "var(--primary-strong)", textDecoration: "none" }}>Edit</Link>
          {mode.status === "ACTIVE" && (
            <button
              onClick={() => startTransition(() => markStudyModeInactiveAction(mode.id))}
              disabled={pending}
              style={{ padding: "4px 10px", borderRadius: 7, border: "1px solid var(--warn)", background: "var(--warn-soft)", color: "var(--warn)", fontSize: 12, fontWeight: 600, cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1 }}
            >
              Mark inactive
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
