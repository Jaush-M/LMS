"use client";

import { useActionState } from "react";
import { createClassSessionEducatorAction } from "@/lib/actions/class-sessions-action";
import { Plus } from "lucide-react";

type SessionType = { id: string; name: string };

type Props = {
  moduleOfferingId: string;
  sessionTypes: SessionType[];
};

const inputStyle: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid var(--line)",
  background: "var(--surface)",
  color: "var(--ink)",
  fontSize: 13,
  padding: "7px 10px",
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
};

export function ScheduleSessionForm({ moduleOfferingId, sessionTypes }: Props) {
  const [state, action, pending] = useActionState(createClassSessionEducatorAction, null);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />

      {state?.error && (
        <p role="alert" style={{ fontSize: 13, color: "var(--bad)" }}>{state.error}</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>Session Type</label>
          <select name="sessionTypeId" required style={inputStyle}>
            <option value="">Select type…</option>
            {sessionTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>Location (optional)</label>
          <input name="sessionLocation" placeholder="e.g. Room 201" style={inputStyle} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>Start</label>
          <input type="datetime-local" name="startAt" required style={inputStyle} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>Finish</label>
          <input type="datetime-local" name="finishAt" required style={inputStyle} />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={pending}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 18px", borderRadius: 10,
            background: "var(--primary-strong)", color: "#fff",
            fontSize: 13.5, fontWeight: 700, border: "none",
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          <Plus size={14} />
          {pending ? "Scheduling…" : "Schedule Session"}
        </button>
      </div>
    </form>
  );
}
