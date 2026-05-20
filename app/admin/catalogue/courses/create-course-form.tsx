"use client";

import { useActionState } from "react";
import { createCourseAction } from "@/lib/actions/catalogue-action";
import { Plus } from "lucide-react";

type Faculty = { id: string; name: string };

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

export function CreateCourseForm({ faculties }: { faculties: Faculty[] }) {
  const [state, action, pending] = useActionState(createCourseAction, null);

  return (
    <div style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface-2)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>Add Course</p>
      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {state?.error && <p role="alert" style={{ fontSize: 12.5, color: "var(--bad)" }}>{state.error}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label htmlFor="code" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Course code</label>
            <input id="code" name="code" type="text" required style={{ ...inputStyle, fontFamily: "monospace" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label htmlFor="awardLevel" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Award level</label>
            <select id="awardLevel" name="awardLevel" required style={inputStyle}>
              <option value="">Select level</option>
              <option value="FOUNDATION">Foundation</option>
              <option value="DIPLOMA">Diploma</option>
              <option value="DEGREE">Degree</option>
              <option value="MASTERS">Masters</option>
              <option value="PHD">PhD</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label htmlFor="name" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Name</label>
          <input id="name" name="name" type="text" required style={inputStyle} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label htmlFor="facultyId" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Faculty</label>
            <select id="facultyId" name="facultyId" required style={inputStyle}>
              <option value="">Select faculty</option>
              {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label htmlFor="awardingBody" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Awarding body <span style={{ fontWeight: 400, color: "var(--ink-4)" }}>(optional)</span></label>
            <input id="awardingBody" name="awardingBody" type="text" style={inputStyle} />
          </div>
        </div>
        <div>
          <button
            type="submit"
            disabled={pending}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 16px", borderRadius: 10, background: "var(--primary-strong)", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1, boxShadow: "0 4px 12px -4px oklch(0.5 0.15 162 / 0.35)" }}
          >
            <Plus size={13} />
            {pending ? "Adding…" : "Add course"}
          </button>
        </div>
      </form>
    </div>
  );
}
