"use client";

import { useActionState } from "react";
import { submitFeedbackResponseAction } from "@/lib/actions/feedback-action";

export function FeedbackForm({ moduleOfferingId }: { moduleOfferingId: string }) {
  const [state, action, pending] = useActionState(submitFeedbackResponseAction, null);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />

      {state?.error && (
        <p role="alert" style={{ fontSize: 13, color: "var(--bad)" }}>{state.error}</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Rating (1–5)</label>
        <div style={{ display: "flex", gap: 10 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
              <input type="radio" name="rating" value={n} required style={{ accentColor: "var(--primary-strong)", width: 16, height: 16 }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-3)" }}>{n}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="comment" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Comment (optional)</label>
        <textarea
          id="comment"
          name="comment"
          rows={4}
          placeholder="Share your thoughts about this module…"
          style={{
            borderRadius: 10,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--ink)",
            fontSize: 13.5,
            padding: "9px 12px",
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        style={{
          alignSelf: "flex-start",
          padding: "9px 20px",
          borderRadius: 10,
          background: "var(--primary-strong)",
          color: "#fff",
          fontSize: 13.5,
          fontWeight: 700,
          border: "none",
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? "Submitting…" : "Submit Feedback"}
      </button>
    </form>
  );
}
