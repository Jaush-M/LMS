"use client";

import { useActionState } from "react";
import { createStudyModeAction } from "@/lib/actions/catalogue-action";
import { Plus } from "lucide-react";

export function CreateStudyModeForm() {
  const [state, action, pending] = useActionState(createStudyModeAction, null);

  return (
    <form action={action} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
      {state?.error && <p role="alert" style={{ fontSize: 12.5, color: "var(--bad)" }}>{state.error}</p>}
      <input
        id="mode-name"
        name="name"
        type="text"
        required
        placeholder="Study mode name"
        style={{ borderRadius: 9, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 13.5, padding: "8px 12px", outline: "none", fontFamily: "inherit", minWidth: 200 }}
      />
      <button
        type="submit"
        disabled={pending}
        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 16px", borderRadius: 10, background: "var(--primary-strong)", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1, boxShadow: "0 4px 12px -4px oklch(0.5 0.15 162 / 0.35)", flexShrink: 0 }}
      >
        <Plus size={13} />
        {pending ? "Adding…" : "Add study mode"}
      </button>
    </form>
  );
}
