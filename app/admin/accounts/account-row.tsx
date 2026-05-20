"use client";

import { useTransition } from "react";
import {
  activateAccountAction,
  disableAccountAction,
  reactivateAccountAction,
} from "@/lib/actions/account-management-action";
import { Chip } from "@/components/ui/chip";

type Account = {
  id: string;
  generatedIdentifier: string;
  institutionalEmail: string;
  role: string;
  status: string;
};

const STATUS_CHIP: Record<string, "ok" | "warn" | "bad" | "default"> = {
  ACTIVE: "ok",
  INACTIVE: "warn",
  DISABLED: "bad",
};

const STATUS_LABEL: Record<string, string> = {
  INACTIVE: "Inactive",
  ACTIVE: "Active",
  DISABLED: "Disabled",
};

const ROLE_CHIP: Record<string, "lav" | "sky" | "default"> = {
  STUDENT: "sky",
  EDUCATOR: "lav",
};

const ACTION_STYLE = {
  base: {
    padding: "5px 12px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    transition: "opacity 0.15s",
  } as React.CSSProperties,
  activate: { background: "var(--ok)", color: "#fff" } as React.CSSProperties,
  disable:  { background: "var(--bad)", color: "#fff" } as React.CSSProperties,
  reactivate: { background: "var(--primary-strong)", color: "#fff" } as React.CSSProperties,
};

export function AccountRow({ account }: { account: Account }) {
  const [pending, startTransition] = useTransition();

  function handleActivate() {
    startTransition(() => activateAccountAction(account.id));
  }

  function handleDisable() {
    startTransition(() => disableAccountAction(account.id));
  }

  function handleReactivate() {
    startTransition(() => reactivateAccountAction(account.id));
  }

  return (
    <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
      <td style={{ padding: "11px 20px", fontFamily: "monospace", fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>
        {account.generatedIdentifier}
      </td>
      <td style={{ padding: "11px 20px", fontSize: 13, color: "var(--ink)" }}>
        {account.institutionalEmail}
      </td>
      <td style={{ padding: "11px 20px" }}>
        <Chip variant={ROLE_CHIP[account.role] ?? "default"} size="sm">
          {account.role.toLowerCase()}
        </Chip>
      </td>
      <td style={{ padding: "11px 20px" }}>
        <Chip variant={STATUS_CHIP[account.status] ?? "default"} dot size="sm">
          {STATUS_LABEL[account.status] ?? account.status}
        </Chip>
      </td>
      <td style={{ padding: "11px 20px" }}>
        {account.status === "INACTIVE" && (
          <button onClick={handleActivate} disabled={pending} style={{ ...ACTION_STYLE.base, ...ACTION_STYLE.activate, opacity: pending ? 0.5 : 1 }}>
            Activate
          </button>
        )}
        {account.status === "ACTIVE" && (
          <button onClick={handleDisable} disabled={pending} style={{ ...ACTION_STYLE.base, ...ACTION_STYLE.disable, opacity: pending ? 0.5 : 1 }}>
            Disable
          </button>
        )}
        {account.status === "DISABLED" && (
          <button onClick={handleReactivate} disabled={pending} style={{ ...ACTION_STYLE.base, ...ACTION_STYLE.reactivate, opacity: pending ? 0.5 : 1 }}>
            Reactivate
          </button>
        )}
      </td>
    </tr>
  );
}
