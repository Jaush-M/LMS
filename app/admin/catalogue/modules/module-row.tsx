"use client";

import { useTransition } from "react";
import { markModuleInactiveAction } from "@/lib/actions/catalogue-action";
import Link from "next/link";
import { Chip } from "@/components/ui/chip";

type Module = { id: string; code: string; name: string; status: string };

export function ModuleRow({ module: mod }: { module: Module }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
      <td style={{ padding: "10px 18px", fontFamily: "monospace", fontSize: 12, color: "var(--ink-3)" }}>{mod.code}</td>
      <td style={{ padding: "10px 8px", fontWeight: 600, color: "var(--ink)" }}>{mod.name}</td>
      <td style={{ padding: "10px 8px" }}>
        <Chip variant={mod.status === "ACTIVE" ? "ok" : "default"} size="sm">{mod.status === "ACTIVE" ? "Active" : "Inactive"}</Chip>
      </td>
      <td style={{ padding: "10px 18px 10px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href={`/admin/catalogue/modules/${mod.id}/edit`} style={{ fontSize: 13, fontWeight: 600, color: "var(--primary-strong)", textDecoration: "none" }}>Edit</Link>
          {mod.status === "ACTIVE" && (
            <button
              onClick={() => startTransition(() => markModuleInactiveAction(mod.id))}
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
