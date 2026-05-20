"use client";

import { useActionState } from "react";
import { createAdministratorAction } from "@/lib/actions/create-account-action";
import { CheckCircle } from "lucide-react";
import { Banner } from "@/components/ui/banner";

export function CreateAdministratorForm() {
  const [state, action, pending] = useActionState(createAdministratorAction, null);

  if (state?.result) {
    const { identifier, institutionalEmail, temporaryPassword } = state.result;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, borderRadius: 14, border: "1px solid var(--ok)", background: "var(--ok-soft)", padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle size={16} style={{ color: "var(--ok)" }} />
          <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ok)" }}>Administrator account created</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Identifier", value: identifier },
            { label: "Institutional email", value: institutionalEmail },
            { label: "Temporary password", value: temporaryPassword },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-3)", marginBottom: 2 }}>{label}</p>
              <p style={{ fontFamily: "monospace", fontSize: 13.5, color: "var(--ink)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px" }}>{value}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-3)" }}>Share these credentials securely. The password must be changed on first sign-in.</p>
      </div>
    );
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 420 }}>
      {state?.error && <Banner variant="bad">{state.error}</Banner>}

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label htmlFor="name" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Full name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          style={{
            width: "100%",
            borderRadius: 9,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--ink)",
            fontSize: 13.5,
            padding: "9px 12px",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={pending}
          style={{
            width: "100%",
            padding: "10px 20px",
            borderRadius: 10,
            background: "var(--primary-strong)",
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 700,
            border: "none",
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
            boxShadow: "0 4px 12px -4px oklch(0.5 0.15 162 / 0.35)",
          }}
        >
          {pending ? "Creating…" : "Create administrator"}
        </button>
      </div>
    </form>
  );
}
