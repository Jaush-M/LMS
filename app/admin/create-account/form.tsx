"use client";

import { useActionState } from "react";
import { createStudentOrEducatorAction } from "@/lib/actions/create-account-action";

export function CreateAccountForm() {
  const [state, action, pending] = useActionState(
    createStudentOrEducatorAction,
    null
  );

  if (state?.result) {
    const { identifier, institutionalEmail, temporaryPassword } = state.result;
    return (
      <div className="space-y-4 rounded border p-4">
        <h2 className="font-semibold text-green-700">Account created</h2>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="font-medium">Identifier</dt>
            <dd className="font-mono">{identifier}</dd>
          </div>
          <div>
            <dt className="font-medium">Institutional email</dt>
            <dd className="font-mono">{institutionalEmail}</dd>
          </div>
          <div>
            <dt className="font-medium">Temporary password</dt>
            <dd className="font-mono">{temporaryPassword}</dd>
          </div>
        </dl>
        <p className="text-xs text-gray-500">
          Share these credentials securely. The password must be changed on first sign-in.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <div role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium">
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="role" className="block text-sm font-medium">
          Role
        </label>
        <select
          id="role"
          name="role"
          required
          className="w-full rounded border px-3 py-2 text-sm"
        >
          <option value="">Select a role</option>
          <option value="STUDENT">Student</option>
          <option value="EDUCATOR">Educator</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
