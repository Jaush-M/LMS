"use client";

import { useActionState } from "react";
import { submitAttendanceAction } from "@/lib/actions/attendance-action";
import { EmptyState } from "@/components/ui/empty";

type Student = {
  id: string;
  name: string;
  identifier: string;
  currentStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | null;
};

type Props = {
  classSessionId: string;
  moduleOfferingId: string;
  isLocked: boolean;
  students: Student[];
};

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PRESENT: { bg: "var(--ok-soft)", color: "var(--ok)" },
  ABSENT: { bg: "var(--bad-soft, oklch(0.97 0.02 20))", color: "var(--bad)" },
  LATE: { bg: "var(--warn-soft)", color: "var(--warn)" },
  EXCUSED: { bg: "var(--surface-3)", color: "var(--ink-3)" },
};

export function AttendanceForm({ classSessionId, moduleOfferingId, isLocked, students }: Props) {
  const [state, action, pending] = useActionState(submitAttendanceAction, null);

  if (students.length === 0) {
    return <EmptyState title="No enrolled students" body="There are no active enrollments for this session." />;
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="hidden" name="classSessionId" value={classSessionId} />
      <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />

      {state?.error && <p role="alert" style={{ fontSize: 13, color: "var(--bad)" }}>{state.error}</p>}

      <div style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr repeat(4, auto)", gap: 0 }}>
          <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--line-2)", fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>Student</div>
          {STATUSES.map((s) => (
            <div key={s} style={{ padding: "10px 20px", borderBottom: "1px solid var(--line-2)", fontSize: 12, fontWeight: 600, color: "var(--ink-3)", textAlign: "center" }}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </div>
          ))}
          {students.map((student) => (
            <>
              <div key={`name-${student.id}`} style={{ padding: "12px 18px", borderBottom: "1px solid var(--line-2)", display: "flex", flexDirection: "column", gap: 2 }}>
                <input type="hidden" name="studentId" value={student.id} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{student.name}</span>
                <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{student.identifier}</span>
              </div>
              {STATUSES.map((status) => {
                const colors = STATUS_COLORS[status];
                const isChecked = student.currentStatus === status || (!student.currentStatus && status === "PRESENT");
                return (
                  <div key={`${student.id}-${status}`} style={{ padding: "12px 20px", borderBottom: "1px solid var(--line-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, cursor: isLocked ? "default" : "pointer", background: isChecked ? colors.bg : "transparent", transition: "background 0.12s" }}>
                      <input
                        type="radio"
                        name={`status_${student.id}`}
                        value={status}
                        defaultChecked={isChecked}
                        disabled={isLocked}
                        style={{ accentColor: colors.color, width: 15, height: 15 }}
                      />
                    </label>
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {!isLocked && (
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
            {pending ? "Submitting…" : "Submit Attendance"}
          </button>
        </div>
      )}
    </form>
  );
}
