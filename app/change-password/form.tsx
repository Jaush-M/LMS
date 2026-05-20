"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/lib/actions/change-password-action";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, null);

  const inputStyle = {
    width: "100%",
    borderRadius: 12,
    border: "1px solid var(--line)",
    background: "var(--surface)",
    color: "var(--ink)",
    fontSize: 14,
    padding: "11px 14px",
    outline: "none",
  } as React.CSSProperties;

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {state?.error && (
        <div
          role="alert"
          className="flex items-center gap-2 px-3.5 py-3 rounded-xl text-sm font-medium"
          style={{ background: "var(--bad-soft)", color: "var(--bad)" }}
        >
          {state.error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          htmlFor="newPassword"
          className="text-[12.5px] font-semibold"
          style={{ color: "var(--ink-2)" }}
        >
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          style={inputStyle}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--primary-strong)";
            e.currentTarget.style.boxShadow = "0 0 0 4px var(--primary-softer)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--line)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          htmlFor="confirmPassword"
          className="text-[12.5px] font-semibold"
          style={{ color: "var(--ink-2)" }}
        >
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Repeat your new password"
          style={inputStyle}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--primary-strong)";
            e.currentTarget.style.boxShadow = "0 0 0 4px var(--primary-softer)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--line)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-1 py-3 rounded-xl font-bold text-sm text-white transition-colors disabled:opacity-60"
        style={{
          background: pending ? "var(--primary-deep)" : "var(--primary-strong)",
          boxShadow: "0 8px 16px -8px oklch(0.5 0.15 162 / 0.45)",
          fontSize: 14,
        }}
      >
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
