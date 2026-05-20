"use client";

import { useActionState } from "react";
import { createCourseOfferingEventAction } from "@/lib/actions/academic-calendar-action";

type CourseOffering = { id: string; name: string };

export function CreateCourseOfferingEventForm({ courseOfferings }: { courseOfferings: CourseOffering[] }) {
  const [state, action, pending] = useActionState(createCourseOfferingEventAction, null);

  return (
    <form action={action} className="space-y-3 p-4 border rounded">
      <h2 className="text-sm font-semibold">Add Course Offering Event</h2>
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">{state.error}</p>
      )}
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <label htmlFor="coe-courseOfferingId" className="block text-sm font-medium">Course Offering</label>
          <select id="coe-courseOfferingId" name="courseOfferingId" required className="rounded border px-3 py-2 text-sm">
            <option value="">Select…</option>
            {courseOfferings.map((co) => (
              <option key={co.id} value={co.id}>{co.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="coe-title" className="block text-sm font-medium">Title</label>
          <input id="coe-title" name="title" type="text" required className="rounded border px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label htmlFor="coe-startAt" className="block text-sm font-medium">Start</label>
          <input id="coe-startAt" name="startAt" type="datetime-local" required className="rounded border px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label htmlFor="coe-finishAt" className="block text-sm font-medium">Finish (optional)</label>
          <input id="coe-finishAt" name="finishAt" type="datetime-local" className="rounded border px-3 py-2 text-sm" />
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={pending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {pending ? "Adding…" : "Add event"}
          </button>
        </div>
      </div>
    </form>
  );
}
