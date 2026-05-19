"use client";

import { useActionState } from "react";
import { createSessionTypeAction } from "@/lib/actions/catalogue-action";

export function CreateSessionTypeForm() {
  const [state, action, pending] = useActionState(createSessionTypeAction, null);

  return (
    <form action={action} className="flex gap-2 items-end">
      {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <div className="space-y-1">
        <label htmlFor="type-name" className="block text-sm font-medium">Name</label>
        <input id="type-name" name="name" type="text" required className="rounded border px-3 py-2 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {pending ? "Adding…" : "Add session type"}
      </button>
    </form>
  );
}
