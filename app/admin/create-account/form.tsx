"use client";

import { useActionState } from "react";
import { createStudentOrEducatorAction } from "@/lib/actions/create-account-action";
import { CheckCircle } from "lucide-react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid var(--line)",
  background: "var(--surface)",
  color: "var(--ink)",
  fontSize: 14,
  padding: "10px 12px",
  outline: "none",
};

export function CreateAccountForm() {
  const [state, action, pending] = useActionState(
    createStudentOrEducatorAction,
    null
  );

  if (state?.result) {
    const { identifier, institutionalEmail, temporaryPassword } = state.result;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ok)", fontWeight: 700, fontSize: 15 }}>
          <CheckCircle size={20} />
          Account created
        </div>
        <div
          style={{
            padding: 18,
            borderRadius: 14,
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {[
            { label: "Identifier", value: identifier },
            { label: "Institutional email", value: institutionalEmail },
            { label: "Temporary password", value: temporaryPassword },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
                {label}
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "var(--ink)", letterSpacing: "0.02em" }}>
                {value}
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-4)" }}>
          Share these credentials securely. The password must be changed on first sign-in.
        </p>
      </div>
    );
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {state?.error && (
        <div role="alert" style={{ padding: "10px 14px", borderRadius: 10, background: "var(--bad-soft)", color: "var(--bad)", fontSize: 13, fontWeight: 500 }}>
          {state.error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="name" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Full name</label>
        <input id="name" name="name" type="text" required style={inputStyle} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="role" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Role</label>
        <select id="role" name="role" required style={inputStyle}>
          <option value="">Select a role…</option>
          <option value="STUDENT">Student</option>
          <option value="EDUCATOR">Educator</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={pending}
        style={{
          padding: "10px 20px",
          borderRadius: 10,
          background: pending ? "var(--primary-deep)" : "var(--primary-strong)",
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
          border: "none",
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.7 : 1,
          boxShadow: "0 4px 12px -4px oklch(0.5 0.15 162 / 0.45)",
        }}
      >
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
