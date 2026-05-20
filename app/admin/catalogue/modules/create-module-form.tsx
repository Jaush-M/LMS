"use client";

import { useActionState } from "react";
import { createModuleAction } from "@/lib/actions/catalogue-action";
import { Plus } from "lucide-react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 9,
  border: "1px solid var(--line)",
  background: "var(--surface)",
  color: "var(--ink)",
  fontSize: 13.5,
  padding: "9px 12px",
  outline: "none",
  fontFamily: "inherit",
};

export function CreateModuleForm() {
  const [state, action, pending] = useActionState(createModuleAction, null);

  return (
    <div style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface-2)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>Add Module</p>
      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {state?.error && <p role="alert" style={{ fontSize: 12.5, color: "var(--bad)" }}>{state.error}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label htmlFor="code" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Module code</label>
            <input id="code" name="code" type="text" required style={{ ...inputStyle, fontFamily: "monospace" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label htmlFor="name" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Name</label>
            <input id="name" name="name" type="text" required style={inputStyle} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label htmlFor="description" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Description <span style={{ fontWeight: 400, color: "var(--ink-4)" }}>(optional)</span></label>
          <textarea id="description" name="description" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </div>
        <div>
          <button
            type="submit"
            disabled={pending}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 16px", borderRadius: 10, background: "var(--primary-strong)", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1, boxShadow: "0 4px 12px -4px oklch(0.5 0.15 162 / 0.35)" }}
          >
            <Plus size={13} />
            {pending ? "Adding…" : "Add module"}
          </button>
        </div>
      </form>
    </div>
  );
}
