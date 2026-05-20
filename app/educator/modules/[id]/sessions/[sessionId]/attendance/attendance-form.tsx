"use client";

import { useActionState } from "react";
import { submitAttendanceAction } from "@/lib/actions/attendance-action";

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

export function AttendanceForm({ classSessionId, moduleOfferingId, isLocked, students }: Props) {
  const [state, action, pending] = useActionState(submitAttendanceAction, null);

  if (students.length === 0) {
    return <p className="text-sm text-gray-500">No enrolled students.</p>;
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="classSessionId" value={classSessionId} />
      <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />

      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4 font-medium">Student</th>
            {STATUSES.map((s) => (
              <th key={s} className="py-2 pr-3 font-medium text-center">{s.charAt(0) + s.slice(1).toLowerCase()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id} className="border-b">
              <td className="py-3 pr-4">
                <input type="hidden" name="studentId" value={student.id} />
                <p className="font-medium">{student.name}</p>
                <p className="text-xs text-gray-400">{student.identifier}</p>
              </td>
              {STATUSES.map((status) => (
                <td key={status} className="py-3 pr-3 text-center">
                  <input
                    type="radio"
                    name={`status_${student.id}`}
                    value={status}
                    defaultChecked={student.currentStatus === status || (!student.currentStatus && status === "PRESENT")}
                    disabled={isLocked}
                    className="accent-blue-600"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {!isLocked && (
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit Attendance"}
        </button>
      )}
    </form>
  );
}
