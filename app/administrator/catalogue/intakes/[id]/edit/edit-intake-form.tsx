"use client";

import { useActionState } from "react";
import { editIntakeAction } from "@/lib/actions/catalogue-action";

export function EditIntakeForm({ id, defaultName }: { id: string; defaultName: string }) {
  const [state, action, pending] = useActionState(editIntakeAction, null);

  return (
    <form action={action} className="space-y-4 max-w-sm">
      {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <input type="hidden" name="id" value={id} />
      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium">Name</label>
        <input id="name" name="name" type="text" required defaultValue={defaultName} className="w-full rounded border px-3 py-2 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
