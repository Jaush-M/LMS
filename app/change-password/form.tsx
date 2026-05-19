"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/lib/actions/change-password-action";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, null);

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <div role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      <div className="space-y-1">
        <label htmlFor="newPassword" className="block text-sm font-medium">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="block text-sm font-medium">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
