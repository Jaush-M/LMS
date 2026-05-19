"use client";

import { useActionState } from "react";
import { createIntakeAction } from "@/lib/actions/catalogue-action";

export function CreateIntakeForm() {
  const [state, action, pending] = useActionState(createIntakeAction, null);

  return (
    <form action={action} className="flex gap-2 items-end">
      {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <div className="space-y-1">
        <label htmlFor="intake-name" className="block text-sm font-medium">Name</label>
        <input id="intake-name" name="name" type="text" required className="rounded border px-3 py-2 text-sm" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add intake"}
      </button>
    </form>
  );
}
