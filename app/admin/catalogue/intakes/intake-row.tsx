"use client";

import { useTransition } from "react";
import { markIntakeInactiveAction } from "@/lib/actions/catalogue-action";
import Link from "next/link";
import { Chip } from "@/components/ui/chip";

type Intake = { id: string; name: string; status: string };

export function IntakeRow({ intake }: { intake: Intake }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
      <td style={{ padding: "10px 18px", fontWeight: 600, color: "var(--ink)" }}>{intake.name}</td>
      <td style={{ padding: "10px 8px" }}>
        <Chip variant={intake.status === "ACTIVE" ? "ok" : "default"} size="sm">{intake.status === "ACTIVE" ? "Active" : "Inactive"}</Chip>
      </td>
      <td style={{ padding: "10px 18px 10px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href={`/admin/catalogue/intakes/${intake.id}/edit`} style={{ fontSize: 13, fontWeight: 600, color: "var(--primary-strong)", textDecoration: "none" }}>Edit</Link>
          {intake.status === "ACTIVE" && (
            <button
              onClick={() => startTransition(() => markIntakeInactiveAction(intake.id))}
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
