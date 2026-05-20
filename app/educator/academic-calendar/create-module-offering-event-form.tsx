"use client";

import { useActionState } from "react";
import { createModuleOfferingEventAction } from "@/lib/actions/academic-calendar-action";

type ModuleOffering = { id: string; label: string };

const inputStyle: React.CSSProperties = {
  borderRadius: 9,
  border: "1px solid var(--line)",
  background: "var(--surface)",
  color: "var(--ink)",
  fontSize: 13,
  padding: "8px 11px",
  outline: "none",
};

export function CreateModuleOfferingEventForm({ moduleOfferings }: { moduleOfferings: ModuleOffering[] }) {
  const [state, action, pending] = useActionState(createModuleOfferingEventAction, null);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-2)" }}>Add Module Offering Event</div>
      {state?.error && (
        <p role="alert" style={{ fontSize: 13, color: "var(--bad)" }}>{state.error}</p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label htmlFor="moe-moduleOfferingId" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>Module Offering</label>
          <select id="moe-moduleOfferingId" name="moduleOfferingId" required style={inputStyle}>
            <option value="">Select…</option>
            {moduleOfferings.map((mo) => (
              <option key={mo.id} value={mo.id}>{mo.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label htmlFor="moe-title" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>Title</label>
          <input id="moe-title" name="title" type="text" required style={inputStyle} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label htmlFor="moe-startAt" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>Start</label>
          <input id="moe-startAt" name="startAt" type="datetime-local" required style={inputStyle} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label htmlFor="moe-finishAt" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>Finish (optional)</label>
          <input id="moe-finishAt" name="finishAt" type="datetime-local" style={inputStyle} />
        </div>
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "8px 16px",
            borderRadius: 9,
            background: "var(--primary-strong)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            border: "none",
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Adding…" : "Add event"}
        </button>
      </div>
    </form>
  );
}
