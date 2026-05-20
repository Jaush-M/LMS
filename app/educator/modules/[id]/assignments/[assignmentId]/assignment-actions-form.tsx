"use client";

import { useActionState, useState } from "react";
import { publishAssignmentAction, unpublishAssignmentAction, extendDeadlineAction } from "@/lib/actions/assignment-action";

type Props = {
  moduleOfferingId: string;
  assignmentId: string;
  isPublished: boolean;
  currentDeadline: string;
};

export function AssignmentActionsForm({ moduleOfferingId, assignmentId, isPublished, currentDeadline }: Props) {
  const [showExtend, setShowExtend] = useState(false);
  const [pubState, pubAction, pubPending] = useActionState(
    isPublished ? unpublishAssignmentAction : publishAssignmentAction,
    null
  );
  const [extState, extAction, extPending] = useActionState(extendDeadlineAction, null);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <form action={pubAction}>
          <input type="hidden" name="id" value={assignmentId} />
          <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
          {pubState?.error && <p className="text-xs text-red-600 mb-1">{pubState.error}</p>}
          <button
            type="submit"
            disabled={pubPending}
            className={`rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${isPublished ? "bg-gray-500 hover:bg-gray-600" : "bg-green-600 hover:bg-green-700"}`}
          >
            {pubPending ? "…" : isPublished ? "Unpublish" : "Publish"}
          </button>
        </form>

        <button
          onClick={() => setShowExtend(!showExtend)}
          className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Extend Deadline
        </button>
      </div>

      {showExtend && (
        <form action={extAction} className="rounded border border-gray-200 bg-gray-50 p-4 space-y-3">
          <input type="hidden" name="assignmentId" value={assignmentId} />
          <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
          {extState?.error && <p className="text-sm text-red-600">{extState.error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium">New Deadline</label>
              <input name="newDeadline" type="datetime-local" defaultValue={currentDeadline} required className="w-full rounded border px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium">Reason</label>
              <input name="reason" required placeholder="Reason for extension" className="w-full rounded border px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={extPending} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {extPending ? "Extending…" : "Extend Deadline"}
          </button>
        </form>
      )}
    </div>
  );
}
