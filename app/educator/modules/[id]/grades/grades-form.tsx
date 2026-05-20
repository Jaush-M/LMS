"use client";

import { useActionState } from "react";
import { enterComponentMarkAction, releaseComponentMarkAction, releaseFinalGradesAction } from "@/lib/actions/assessment-action";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty";

type ComponentMarkData = { id: string; studentId: string; studentName: string; score: number; status: string };
type ComponentData = { id: string; title: string; maximumMark: number; componentMarks: ComponentMarkData[] };
type StudentData = { id: string; name: string };
type FinalGradeData = { studentId: string; percentage: number; isPassing: boolean; status: string };

type Props = {
  moduleOfferingId: string;
  components: ComponentData[];
  students: StudentData[];
  finalGrades: FinalGradeData[];
  canReleaseFinalGrades: boolean;
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
};

function MarkEntryRow({ comp, students, moduleOfferingId }: { comp: ComponentData; students: StudentData[]; moduleOfferingId: string }) {
  const [markState, markAction, markPending] = useActionState(enterComponentMarkAction, null);
  return (
    <form action={markAction} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", padding: "12px 18px", borderBottom: "1px solid var(--line-2)", background: "var(--surface-2)" }}>
      <input type="hidden" name="assessmentComponentId" value={comp.id} />
      <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
      {markState?.error && <p role="alert" style={{ width: "100%", fontSize: 12.5, color: "var(--bad)" }}>{markState.error}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-3)" }}>Student</label>
        <select name="studentId" required style={{ ...inputStyle, minWidth: 180 }}>
          <option value="">Select student</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-3)" }}>Score (max {comp.maximumMark})</label>
        <input name="score" type="number" min="0" max={comp.maximumMark} step="0.5" required style={{ ...inputStyle, width: 90 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-3)" }}>Feedback</label>
        <input name="feedback" placeholder="Optional" style={{ ...inputStyle, width: 200 }} />
      </div>
      <button
        type="submit"
        disabled={markPending}
        style={{
          padding: "7px 16px",
          borderRadius: 9,
          background: "var(--primary-strong)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          border: "none",
          cursor: markPending ? "default" : "pointer",
          opacity: markPending ? 0.6 : 1,
        }}
      >
        {markPending ? "Saving…" : "Enter Mark"}
      </button>
    </form>
  );
}

function ReleaseMarkButton({ markId, moduleOfferingId }: { markId: string; moduleOfferingId: string }) {
  const [, relAction, relPending] = useActionState(releaseComponentMarkAction, null);
  return (
    <form action={relAction} style={{ display: "inline" }}>
      <input type="hidden" name="componentMarkId" value={markId} />
      <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
      <button
        type="submit"
        disabled={relPending}
        style={{
          padding: "4px 10px",
          borderRadius: 7,
          background: "var(--ok-soft)",
          color: "var(--ok)",
          fontSize: 11.5,
          fontWeight: 600,
          border: "none",
          cursor: relPending ? "default" : "pointer",
          opacity: relPending ? 0.6 : 1,
        }}
      >
        {relPending ? "…" : "Release"}
      </button>
    </form>
  );
}

function ReleaseFinalGradesButton({ moduleOfferingId }: { moduleOfferingId: string }) {
  const [fgState, fgAction, fgPending] = useActionState(releaseFinalGradesAction, null);
  return (
    <form action={fgAction}>
      <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
      {fgState?.error && <p style={{ fontSize: 12, color: "var(--bad)", marginBottom: 4 }}>{fgState.error}</p>}
      <button
        type="submit"
        disabled={fgPending}
        style={{
          padding: "7px 14px",
          borderRadius: 9,
          background: "var(--primary-strong)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          border: "none",
          cursor: fgPending ? "default" : "pointer",
          opacity: fgPending ? 0.6 : 1,
        }}
      >
        {fgPending ? "Releasing…" : "Release All Final Grades"}
      </button>
    </form>
  );
}

export function GradesForm({ moduleOfferingId, components, students, finalGrades, canReleaseFinalGrades }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {components.map((comp) => (
        <div key={comp.id} style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--line-2)" }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{comp.title}</span>
            <span style={{ fontSize: 12.5, color: "var(--ink-3)", marginLeft: 8 }}>max {comp.maximumMark}</span>
          </div>
          <MarkEntryRow comp={comp} students={students} moduleOfferingId={moduleOfferingId} />
          {comp.componentMarks.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
                  <th style={{ padding: "9px 18px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Student</th>
                  <th style={{ padding: "9px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Score</th>
                  <th style={{ padding: "9px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Status</th>
                  <th style={{ padding: "9px 18px 9px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}></th>
                </tr>
              </thead>
              <tbody>
                {comp.componentMarks.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                    <td style={{ padding: "9px 18px", fontWeight: 500, color: "var(--ink)" }}>{m.studentName}</td>
                    <td style={{ padding: "9px 8px", color: "var(--ink-2)" }}>{m.score}</td>
                    <td style={{ padding: "9px 8px" }}>
                      <Chip variant={m.status === "RELEASED" ? "ok" : "warn"} size="sm">{m.status}</Chip>
                    </td>
                    <td style={{ padding: "9px 18px 9px 8px" }}>
                      {m.status === "DRAFT" && <ReleaseMarkButton markId={m.id} moduleOfferingId={moduleOfferingId} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      <div style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 18px", borderBottom: "1px solid var(--line-2)", background: "var(--surface-2)" }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>Final Grades</span>
          {canReleaseFinalGrades && <ReleaseFinalGradesButton moduleOfferingId={moduleOfferingId} />}
        </div>
        {finalGrades.length === 0 ? (
          <div style={{ padding: 18 }}>
            <EmptyState title="No final grades released" body="Release component marks first to calculate final grades." />
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
                <th style={{ padding: "9px 18px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Student</th>
                <th style={{ padding: "9px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>%</th>
                <th style={{ padding: "9px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Result</th>
                <th style={{ padding: "9px 18px 9px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {finalGrades.map((g) => {
                const student = students.find((s) => s.id === g.studentId);
                return (
                  <tr key={g.studentId} style={{ borderBottom: "1px solid var(--line-2)" }}>
                    <td style={{ padding: "9px 18px", fontWeight: 500, color: "var(--ink)" }}>{student?.name ?? g.studentId}</td>
                    <td style={{ padding: "9px 8px", color: "var(--ink-2)" }}>{g.percentage.toFixed(1)}</td>
                    <td style={{ padding: "9px 8px" }}>
                      <Chip variant={g.isPassing ? "ok" : "bad"} size="sm">{g.isPassing ? "Pass" : "Fail"}</Chip>
                    </td>
                    <td style={{ padding: "9px 18px 9px 8px", fontSize: 12, color: "var(--ink-3)" }}>{g.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
