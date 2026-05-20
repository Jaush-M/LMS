"use client";

import { useActionState } from "react";
import { editModuleAction } from "@/lib/actions/catalogue-action";
import { Banner } from "@/components/ui/banner";

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

export function EditModuleForm({ id, defaultName, defaultDescription }: { id: string; defaultName: string; defaultDescription: string | null }) {
  const [state, action, pending] = useActionState(editModuleAction, null);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {state?.error && <Banner variant="bad">{state.error}</Banner>}
      <input type="hidden" name="id" value={id} />
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label htmlFor="name" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Name</label>
        <input id="name" name="name" type="text" required defaultValue={defaultName} style={inputStyle} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label htmlFor="description" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Description <span style={{ fontWeight: 400, color: "var(--ink-4)" }}>(optional)</span></label>
        <textarea id="description" name="description" rows={2} defaultValue={defaultDescription ?? ""} style={{ ...inputStyle, resize: "vertical" }} />
      </div>
      <div>
        <button type="submit" disabled={pending} style={{ padding: "9px 22px", borderRadius: 10, background: "var(--primary-strong)", color: "#fff", fontSize: 13.5, fontWeight: 700, border: "none", cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1, boxShadow: "0 4px 12px -4px oklch(0.5 0.15 162 / 0.35)" }}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
