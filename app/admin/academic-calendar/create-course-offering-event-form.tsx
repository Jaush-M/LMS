"use client";

import { useActionState } from "react";
import { createCourseOfferingEventAction } from "@/lib/actions/academic-calendar-action";

type CourseOffering = { id: string; name: string };

const inputStyle: React.CSSProperties = {
  borderRadius: 9,
  border: "1px solid var(--line)",
  background: "var(--surface)",
  color: "var(--ink)",
  fontSize: 13,
  padding: "8px 11px",
  outline: "none",
};

export function CreateCourseOfferingEventForm({ courseOfferings }: { courseOfferings: CourseOffering[] }) {
  const [state, action, pending] = useActionState(createCourseOfferingEventAction, null);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-2)" }}>Add Course Offering Event</div>
      {state?.error && (
        <p role="alert" style={{ fontSize: 13, color: "var(--bad)" }}>{state.error}</p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label htmlFor="coe-courseOfferingId" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>Course Offering</label>
          <select id="coe-courseOfferingId" name="courseOfferingId" required style={inputStyle}>
            <option value="">Select…</option>
            {courseOfferings.map((co) => (
              <option key={co.id} value={co.id}>{co.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label htmlFor="coe-title" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>Title</label>
          <input id="coe-title" name="title" type="text" required style={inputStyle} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label htmlFor="coe-startAt" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>Start</label>
          <input id="coe-startAt" name="startAt" type="datetime-local" required style={inputStyle} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label htmlFor="coe-finishAt" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>Finish (optional)</label>
          <input id="coe-finishAt" name="finishAt" type="datetime-local" style={inputStyle} />
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
