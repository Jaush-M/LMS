"use client";

import { useActionState, useState } from "react";
import { enrollStudentAction } from "@/lib/actions/course-offering-action";
import { Banner } from "@/components/ui/banner";
import { AlertTriangle } from "lucide-react";

type Student = { id: string; generatedIdentifier: string; name: string };

type Props = {
  courseOfferingId: string;
  students: Student[];
  currentCount: number;
  capacity: number;
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

export function EnrollStudentForm({ courseOfferingId, students, currentCount, capacity }: Props) {
  const [state, action, pending] = useActionState(enrollStudentAction, null);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const atCapacity = currentCount >= capacity;
  const showOverridePrompt = state?.status === "capacity_exceeded";

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="hidden" name="courseOfferingId" value={courseOfferingId} />

      {state?.status === "error" && (
        <Banner variant="bad">
          {state.error}
        </Banner>
      )}

      <input type="hidden" name="studentId" value={selectedStudentId} />

      {showOverridePrompt && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, borderRadius: 12, border: "1px solid var(--warn)", background: "var(--warn-soft)", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <AlertTriangle size={15} style={{ color: "var(--warn)", flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
              This Course Offering is at capacity ({state.currentCount}/{state.capacity}). Provide an override reason to proceed.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Override reason</label>
            <textarea name="overrideReason" rows={2} required style={{ ...inputStyle, resize: "vertical" }} />
          </div>
          <div>
            <button
              type="submit"
              disabled={pending}
              style={{
                padding: "9px 20px",
                borderRadius: 10,
                background: "var(--warn)",
                color: "#fff",
                fontSize: 13.5,
                fontWeight: 700,
                border: "none",
                cursor: pending ? "default" : "pointer",
                opacity: pending ? 0.6 : 1,
              }}
            >
              {pending ? "Confirming…" : "Confirm enrollment with override"}
            </button>
          </div>
        </div>
      )}

      {!showOverridePrompt && (
        <>
          {atCapacity && (
            <Banner variant="warn" icon={<AlertTriangle size={14} />}>
              This offering is at capacity ({currentCount}/{capacity}). You can still proceed — a capacity override reason will be required.
            </Banner>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Student</label>
            <select
              required
              style={inputStyle}
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.generatedIdentifier})
                </option>
              ))}
            </select>
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
              {pending ? "Enrolling…" : "Enroll Student"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
