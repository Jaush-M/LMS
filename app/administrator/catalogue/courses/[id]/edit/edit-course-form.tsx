"use client";

import { useActionState } from "react";
import { editCourseAction } from "@/lib/actions/catalogue-action";

type Course = { id: string; name: string; awardLevel: string; facultyId: string; awardingBody: string | null };
type Faculty = { id: string; name: string };

const AWARD_LEVELS = [
  { value: "FOUNDATION", label: "Foundation" },
  { value: "DIPLOMA", label: "Diploma" },
  { value: "DEGREE", label: "Degree" },
  { value: "MASTERS", label: "Masters" },
  { value: "PHD", label: "PhD" },
];

export function EditCourseForm({ course, faculties }: { course: Course; faculties: Faculty[] }) {
  const [state, action, pending] = useActionState(editCourseAction, null);

  return (
    <form action={action} className="space-y-4 max-w-lg">
      {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <input type="hidden" name="id" value={course.id} />
      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium">Name</label>
        <input id="name" name="name" type="text" required defaultValue={course.name} className="w-full rounded border px-3 py-2 text-sm" />
      </div>
      <div className="space-y-1">
        <label htmlFor="awardLevel" className="block text-sm font-medium">Award level</label>
        <select id="awardLevel" name="awardLevel" required defaultValue={course.awardLevel} className="w-full rounded border px-3 py-2 text-sm">
          {AWARD_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="facultyId" className="block text-sm font-medium">Faculty</label>
        <select id="facultyId" name="facultyId" required defaultValue={course.facultyId} className="w-full rounded border px-3 py-2 text-sm">
          {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="awardingBody" className="block text-sm font-medium">
          Awarding body <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <input id="awardingBody" name="awardingBody" type="text" defaultValue={course.awardingBody ?? ""} className="w-full rounded border px-3 py-2 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
