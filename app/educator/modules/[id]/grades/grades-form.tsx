"use client";

import { useActionState } from "react";
import { enterComponentMarkAction, releaseComponentMarkAction, releaseFinalGradesAction } from "@/lib/actions/assessment-action";

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

function MarkEntryRow({ comp, students, moduleOfferingId }: { comp: ComponentData; students: StudentData[]; moduleOfferingId: string }) {
  const [markState, markAction, markPending] = useActionState(enterComponentMarkAction, null);
  return (
    <form action={markAction} className="px-5 py-3 flex gap-3 flex-wrap items-end border-b border-gray-100">
      <input type="hidden" name="assessmentComponentId" value={comp.id} />
      <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
      {markState?.error && <p role="alert" className="w-full text-sm text-red-600">{markState.error}</p>}
      <div className="space-y-1">
        <label className="block text-xs font-medium">Student</label>
        <select name="studentId" required className="rounded border px-3 py-2 text-sm">
          <option value="">Select student</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <label className="block text-xs font-medium">Score</label>
        <input name="score" type="number" min="0" max={comp.maximumMark} step="0.5" required className="rounded border px-3 py-2 text-sm w-24" />
      </div>
      <div className="space-y-1">
        <label className="block text-xs font-medium">Feedback</label>
        <input name="feedback" placeholder="Optional" className="rounded border px-3 py-2 text-sm w-48" />
      </div>
      <button type="submit" disabled={markPending} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {markPending ? "Saving…" : "Enter Mark"}
      </button>
    </form>
  );
}

function ReleaseMarkButton({ markId, moduleOfferingId }: { markId: string; moduleOfferingId: string }) {
  const [, relAction, relPending] = useActionState(releaseComponentMarkAction, null);
  return (
    <form action={relAction} className="inline">
      <input type="hidden" name="componentMarkId" value={markId} />
      <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
      <button type="submit" disabled={relPending} className="rounded bg-green-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
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
      {fgState?.error && <p className="text-xs text-red-600 mb-1">{fgState.error}</p>}
      <button type="submit" disabled={fgPending} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {fgPending ? "Releasing…" : "Release All Final Grades"}
      </button>
    </form>
  );
}

export function GradesForm({ moduleOfferingId, components, students, finalGrades, canReleaseFinalGrades }: Props) {
  return (
    <div className="space-y-6">
      {components.map((comp) => (
        <section key={comp.id} className="rounded border border-gray-200 bg-white">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-medium">{comp.title} (max {comp.maximumMark})</h3>
          </div>
          <MarkEntryRow comp={comp} students={students} moduleOfferingId={moduleOfferingId} />
          {comp.componentMarks.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left bg-gray-50">
                  <th className="px-5 py-2 font-medium">Student</th>
                  <th className="py-2 pr-4 font-medium">Score</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {comp.componentMarks.map((m) => (
                  <tr key={m.id} className="border-b">
                    <td className="px-5 py-2">{m.studentName}</td>
                    <td className="py-2 pr-4">{m.score}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.status === "RELEASED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="py-2 pr-5">
                      {m.status === "DRAFT" && <ReleaseMarkButton markId={m.id} moduleOfferingId={moduleOfferingId} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}

      <section className="rounded border border-gray-200 bg-white">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-medium">Final Grades</h3>
          {canReleaseFinalGrades && <ReleaseFinalGradesButton moduleOfferingId={moduleOfferingId} />}
        </div>
        {finalGrades.length === 0 ? (
          <p className="px-5 py-3 text-sm text-gray-500">No final grades released yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left bg-gray-50">
                <th className="px-5 py-2 font-medium">Student</th>
                <th className="py-2 pr-4 font-medium">%</th>
                <th className="py-2 pr-4 font-medium">Result</th>
                <th className="py-2 pr-5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {finalGrades.map((g) => {
                const student = students.find((s) => s.id === g.studentId);
                return (
                  <tr key={g.studentId} className="border-b">
                    <td className="px-5 py-2">{student?.name ?? g.studentId}</td>
                    <td className="py-2 pr-4">{g.percentage.toFixed(1)}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${g.isPassing ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {g.isPassing ? "Pass" : "Fail"}
                      </span>
                    </td>
                    <td className="py-2 pr-5 text-xs text-gray-500">{g.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
