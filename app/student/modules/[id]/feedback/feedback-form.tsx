"use client";

import { useActionState } from "react";
import { submitFeedbackResponseAction } from "@/lib/actions/feedback-action";

export function FeedbackForm({ moduleOfferingId }: { moduleOfferingId: string }) {
  const [state, action, pending] = useActionState(submitFeedbackResponseAction, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />

      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}

      <div className="space-y-2">
        <label className="block text-sm font-medium">Rating (1–5)</label>
        <div className="flex gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="flex flex-col items-center gap-1 cursor-pointer">
              <input type="radio" name="rating" value={n} required className="accent-blue-600" />
              <span className="text-sm">{n}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="comment" className="block text-sm font-medium">Comment (optional)</label>
        <textarea
          id="comment"
          name="comment"
          rows={3}
          placeholder="Share your thoughts about this module…"
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit Feedback"}
      </button>
    </form>
  );
}
