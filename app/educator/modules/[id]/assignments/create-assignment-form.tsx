"use client";

import { useActionState, useState } from "react";
import { createAssignmentAction } from "@/lib/actions/assignment-action";

export function CreateAssignmentForm({ moduleOfferingId }: { moduleOfferingId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createAssignmentAction, null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        + New Assignment
      </button>
    );
  }

  return (
    <form action={action} className="rounded border border-gray-200 bg-white p-5 space-y-4">
      <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}

      <div className="space-y-1">
        <label className="block text-sm font-medium">Title</label>
        <input name="title" required className="w-full rounded border px-3 py-2 text-sm" />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium">Instructions</label>
        <textarea name="body" rows={3} className="w-full rounded border px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium">Deadline</label>
          <input name="deadline" type="datetime-local" required className="w-full rounded border px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium">Maximum Mark</label>
          <input name="maximumMark" type="number" min="1" step="0.5" required className="w-full rounded border px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create Assignment"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded border px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
