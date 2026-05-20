"use client";

import { useActionState } from "react";
import { editCourseAction } from "@/lib/actions/catalogue-action";
import { Banner } from "@/components/ui/banner";

type Course = { id: string; name: string; awardLevel: string; facultyId: string; awardingBody: string | null };
type Faculty = { id: string; name: string };

const AWARD_LEVELS = [
  { value: "FOUNDATION", label: "Foundation" },
  { value: "DIPLOMA", label: "Diploma" },
  { value: "DEGREE", label: "Degree" },
  { value: "MASTERS", label: "Masters" },
  { value: "PHD", label: "PhD" },
];

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

export function EditCourseForm({ course, faculties }: { course: Course; faculties: Faculty[] }) {
  const [state, action, pending] = useActionState(editCourseAction, null);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {state?.error && <Banner variant="bad">{state.error}</Banner>}
      <input type="hidden" name="id" value={course.id} />
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label htmlFor="name" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Name</label>
        <input id="name" name="name" type="text" required defaultValue={course.name} style={inputStyle} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label htmlFor="awardLevel" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Award level</label>
        <select id="awardLevel" name="awardLevel" required defaultValue={course.awardLevel} style={inputStyle}>
          {AWARD_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label htmlFor="facultyId" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Faculty</label>
        <select id="facultyId" name="facultyId" required defaultValue={course.facultyId} style={inputStyle}>
          {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label htmlFor="awardingBody" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Awarding body <span style={{ fontWeight: 400, color: "var(--ink-4)" }}>(optional)</span></label>
        <input id="awardingBody" name="awardingBody" type="text" defaultValue={course.awardingBody ?? ""} style={inputStyle} />
      </div>
      <div>
        <button type="submit" disabled={pending} style={{ padding: "9px 22px", borderRadius: 10, background: "var(--primary-strong)", color: "#fff", fontSize: 13.5, fontWeight: 700, border: "none", cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1, boxShadow: "0 4px 12px -4px oklch(0.5 0.15 162 / 0.35)" }}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
