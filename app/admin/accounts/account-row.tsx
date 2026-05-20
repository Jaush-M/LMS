"use client";

import { useTransition } from "react";
import {
  activateAccountAction,
  disableAccountAction,
  reactivateAccountAction,
} from "@/lib/actions/account-management-action";

type Account = {
  id: string;
  generatedIdentifier: string;
  institutionalEmail: string;
  role: string;
  status: string;
};

const STATUS_LABEL: Record<string, string> = {
  INACTIVE: "Inactive",
  ACTIVE: "Active",
  DISABLED: "Disabled",
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
    <tr className="border-b">
      <td className="py-2 pr-4 font-mono">{account.generatedIdentifier}</td>
      <td className="py-2 pr-4">{account.institutionalEmail}</td>
      <td className="py-2 pr-4 capitalize">{account.role.toLowerCase()}</td>
      <td className="py-2 pr-4">{STATUS_LABEL[account.status] ?? account.status}</td>
      <td className="py-2 space-x-2">
        {account.status === "INACTIVE" && (
          <button
            onClick={handleActivate}
            disabled={pending}
            className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Activate
          </button>
        )}
        {account.status === "ACTIVE" && (
          <button
            onClick={handleDisable}
            disabled={pending}
            className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Disable
          </button>
        )}
        {account.status === "DISABLED" && (
          <button
            onClick={handleReactivate}
            disabled={pending}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Reactivate
          </button>
        )}
      </td>
    </tr>
  );
}
