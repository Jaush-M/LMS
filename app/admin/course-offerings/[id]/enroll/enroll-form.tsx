"use client";

import { useActionState, useState } from "react";
import { enrollStudentAction } from "@/lib/actions/course-offering-action";

type Student = { id: string; generatedIdentifier: string; name: string };

type Props = {
  courseOfferingId: string;
  students: Student[];
  currentCount: number;
  capacity: number;
};

export function EnrollStudentForm({ courseOfferingId, students, currentCount, capacity }: Props) {
  const [state, action, pending] = useActionState(enrollStudentAction, null);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const atCapacity = currentCount >= capacity;
  const showOverridePrompt = state?.status === "capacity_exceeded";

  return (
    <form action={action} className="space-y-5 max-w-lg">
      <input type="hidden" name="courseOfferingId" value={courseOfferingId} />

      {state?.status === "error" && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {/* always carry studentId so the override re-submission has it */}
      <input type="hidden" name="studentId" value={selectedStudentId} />

      {showOverridePrompt && (
        <div
          role="alert"
          aria-label="Capacity exceeded"
          className="rounded border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 space-y-3"
        >
          <p>
            This Course Offering is at capacity ({state.currentCount}/{state.capacity}). Provide an override reason to proceed.
          </p>
          <div className="space-y-1">
            <label htmlFor="overrideReason" className="block text-sm font-medium">
              Override reason
            </label>
            <textarea
              id="overrideReason"
              name="overrideReason"
              rows={2}
              required
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
          >
            {pending ? "Confirming…" : "Confirm enrollment with override"}
          </button>
        </div>
      )}

      {!showOverridePrompt && (
        <>
          {atCapacity && (
            <p className="text-sm text-yellow-700 bg-yellow-50 rounded border border-yellow-200 px-3 py-2">
              This offering is at capacity ({currentCount}/{capacity}). You can still proceed — a capacity override reason will be required.
            </p>
          )}

          <div className="space-y-1">
            <label htmlFor="studentId" className="block text-sm font-medium">
              Student
            </label>
            <select
              id="studentId"
              required
              className="w-full rounded border px-3 py-2 text-sm"
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

          <button
            type="submit"
            disabled={pending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? "Enrolling…" : "Enroll Student"}
          </button>
        </>
      )}
    </form>
  );
}
