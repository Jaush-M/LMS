"use client";

import { useActionState, useState } from "react";
import { requestDeadlineExtensionAction } from "@/lib/actions/assignment-action";

type Props = { assignmentId: string; moduleOfferingId: string };

export function ExtensionRequestForm({ assignmentId, moduleOfferingId }: Props) {
  const [state, action, pending] = useActionState(requestDeadlineExtensionAction, null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          fontSize: 12.5, color: "var(--ink-3)", background: "none",
          border: "none", cursor: "pointer", padding: "4px 0",
          textDecoration: "underline", textUnderlineOffset: 2,
        }}
      >
        Request extension
      </button>
    );
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, maxWidth: 420 }}>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
      {state?.error && (
        <p style={{ fontSize: 12.5, color: "var(--bad)" }}>{state.error}</p>
      )}
      <textarea
        name="reason"
        placeholder="Briefly explain why you need an extension…"
        required
        rows={3}
        disabled={pending}
        style={{
          borderRadius: 10, border: "1px solid var(--line)",
          background: "var(--surface)", color: "var(--ink)",
          fontSize: 13, padding: "8px 12px", outline: "none",
          resize: "vertical", fontFamily: "inherit", width: "100%", boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "7px 14px", borderRadius: 10,
            background: "var(--primary-strong)", color: "#fff",
            fontSize: 13, fontWeight: 700, border: "none",
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Sending…" : "Send Request"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            padding: "7px 14px", borderRadius: 10,
            background: "var(--surface-2)", color: "var(--ink-3)",
            fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
