"use client";

import { useActionState, useState } from "react";
import { createAssignmentAction } from "@/lib/actions/assignment-action";
import { Plus, X } from "lucide-react";

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

export function CreateAssignmentForm({ moduleOfferingId }: { moduleOfferingId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createAssignmentAction, null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 16px",
          borderRadius: 10,
          background: "var(--primary-strong)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 12px -4px oklch(0.5 0.15 162 / 0.35)",
        }}
      >
        <Plus size={14} />
        New Assignment
      </button>
    );
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14, padding: 18, borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)" }}>
      <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
      {state?.error && (
        <p role="alert" style={{ fontSize: 13, color: "var(--bad)" }}>{state.error}</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Title</label>
        <input name="title" required style={inputStyle} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Instructions</label>
        <textarea name="body" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Deadline</label>
          <input name="deadline" type="datetime-local" required style={inputStyle} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Maximum Mark</label>
          <input name="maximumMark" type="number" min="1" step="0.5" required style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "8px 18px",
            borderRadius: 9,
            background: "var(--primary-strong)",
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 700,
            border: "none",
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Creating…" : "Create Assignment"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "8px 14px",
            borderRadius: 9,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--ink-3)",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <X size={13} />
          Cancel
        </button>
      </div>
    </form>
  );
}
