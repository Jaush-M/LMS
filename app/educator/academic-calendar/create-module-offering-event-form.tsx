"use client";

import { useActionState } from "react";
import { createModuleOfferingEventAction } from "@/lib/actions/academic-calendar-action";

type ModuleOffering = { id: string; label: string };

export function CreateModuleOfferingEventForm({ moduleOfferings }: { moduleOfferings: ModuleOffering[] }) {
  const [state, action, pending] = useActionState(createModuleOfferingEventAction, null);

  return (
    <form action={action} className="space-y-3 p-4 border rounded">
      <h2 className="text-sm font-semibold">Add Module Offering Event</h2>
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">{state.error}</p>
      )}
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <label htmlFor="moe-moduleOfferingId" className="block text-sm font-medium">Module Offering</label>
          <select id="moe-moduleOfferingId" name="moduleOfferingId" required className="rounded border px-3 py-2 text-sm">
            <option value="">Select…</option>
            {moduleOfferings.map((mo) => (
              <option key={mo.id} value={mo.id}>{mo.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="moe-title" className="block text-sm font-medium">Title</label>
          <input id="moe-title" name="title" type="text" required className="rounded border px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label htmlFor="moe-startAt" className="block text-sm font-medium">Start</label>
          <input id="moe-startAt" name="startAt" type="datetime-local" required className="rounded border px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label htmlFor="moe-finishAt" className="block text-sm font-medium">Finish (optional)</label>
          <input id="moe-finishAt" name="finishAt" type="datetime-local" className="rounded border px-3 py-2 text-sm" />
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
