"use client";

import { useActionState } from "react";
import { createModuleAction } from "@/lib/actions/catalogue-action";

export function CreateModuleForm() {
  const [state, action, pending] = useActionState(createModuleAction, null);

  return (
    <form action={action} className="space-y-4 max-w-lg">
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="code" className="block text-sm font-medium">
            Module code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            required
            className="w-full rounded border px-3 py-2 text-sm font-mono"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="name" className="block text-sm font-medium">
            Name
          </label>
          <input id="name" name="name" type="text" required className="w-full rounded border px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="description" className="block text-sm font-medium">
          Description <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <textarea id="description" name="description" rows={2} className="w-full rounded border px-3 py-2 text-sm" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add module"}
      </button>
    </form>
  );
}
