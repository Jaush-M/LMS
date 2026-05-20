"use client";

import { useActionState } from "react";
import { createInstitutionEventAction } from "@/lib/actions/academic-calendar-action";

export function CreateInstitutionEventForm() {
  const [state, action, pending] = useActionState(createInstitutionEventAction, null);

  return (
    <form action={action} className="space-y-3 p-4 border rounded">
      <h2 className="text-sm font-semibold">Add Institution Event</h2>
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">{state.error}</p>
      )}
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <label htmlFor="ie-title" className="block text-sm font-medium">Title</label>
          <input id="ie-title" name="title" type="text" required className="rounded border px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label htmlFor="ie-startAt" className="block text-sm font-medium">Start</label>
          <input id="ie-startAt" name="startAt" type="datetime-local" required className="rounded border px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label htmlFor="ie-finishAt" className="block text-sm font-medium">Finish (optional)</label>
          <input id="ie-finishAt" name="finishAt" type="datetime-local" className="rounded border px-3 py-2 text-sm" />
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
