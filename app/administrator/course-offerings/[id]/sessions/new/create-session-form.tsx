"use client";

import { useActionState } from "react";
import { createClassSessionAction } from "@/lib/actions/class-sessions-action";

type Props = {
  courseOfferingId: string;
  moduleOfferings: { id: string; name: string }[];
  sessionTypes: { id: string; name: string }[];
};

export function CreateSessionForm({ courseOfferingId, moduleOfferings, sessionTypes }: Props) {
  const [state, action, pending] = useActionState(createClassSessionAction, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="courseOfferingId" value={courseOfferingId} />

      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}

      <div className="space-y-1">
        <label htmlFor="moduleOfferingId" className="block text-sm font-medium">Module</label>
        <select id="moduleOfferingId" name="moduleOfferingId" required className="w-full rounded border px-3 py-2 text-sm">
          <option value="">Select module</option>
          {moduleOfferings.map((mo) => <option key={mo.id} value={mo.id}>{mo.name}</option>)}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="sessionTypeId" className="block text-sm font-medium">Session Type</label>
        <select id="sessionTypeId" name="sessionTypeId" required className="w-full rounded border px-3 py-2 text-sm">
          <option value="">Select type</option>
          {sessionTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="startAt" className="block text-sm font-medium">Start</label>
          <input id="startAt" name="startAt" type="datetime-local" required className="w-full rounded border px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label htmlFor="finishAt" className="block text-sm font-medium">Finish</label>
          <input id="finishAt" name="finishAt" type="datetime-local" required className="w-full rounded border px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="sessionLocation" className="block text-sm font-medium">Location (optional)</label>
        <input id="sessionLocation" name="sessionLocation" type="text" className="w-full rounded border px-3 py-2 text-sm" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Scheduling…" : "Schedule Session"}
      </button>
    </form>
  );
}
