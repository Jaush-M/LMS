"use client";

import { useActionState } from "react";
import { createClassSessionAction } from "@/lib/actions/class-sessions-action";

type Props = {
  courseOfferingId: string;
  moduleOfferings: { id: string; name: string }[];
  sessionTypes: { id: string; name: string }[];
};

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

const labelStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: "var(--ink-2)",
};

export function CreateSessionForm({ courseOfferingId, moduleOfferings, sessionTypes }: Props) {
  const [state, action, pending] = useActionState(createClassSessionAction, null);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input type="hidden" name="courseOfferingId" value={courseOfferingId} />

      {state?.error && <p role="alert" style={{ fontSize: 13, color: "var(--bad)" }}>{state.error}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label style={labelStyle}>Module</label>
        <select name="moduleOfferingId" required style={inputStyle}>
          <option value="">Select module</option>
          {moduleOfferings.map((mo) => <option key={mo.id} value={mo.id}>{mo.name}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label style={labelStyle}>Session Type</label>
        <select name="sessionTypeId" required style={inputStyle}>
          <option value="">Select type</option>
          {sessionTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={labelStyle}>Start</label>
          <input name="startAt" type="datetime-local" required style={inputStyle} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={labelStyle}>Finish</label>
          <input name="finishAt" type="datetime-local" required style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label style={labelStyle}>Location (optional)</label>
        <input name="sessionLocation" type="text" style={inputStyle} />
      </div>

      <div>
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "9px 22px",
            borderRadius: 10,
            background: "var(--primary-strong)",
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 700,
            border: "none",
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
            boxShadow: "0 4px 12px -4px oklch(0.5 0.15 162 / 0.35)",
          }}
        >
          {pending ? "Scheduling…" : "Schedule Session"}
        </button>
      </div>
    </form>
  );
}
