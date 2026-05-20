"use client";

import { useTransition } from "react";
import { markModuleInactiveAction } from "@/lib/actions/catalogue-action";
import Link from "next/link";

type Module = { id: string; code: string; name: string; status: string };

export function ModuleRow({ module: mod }: { module: Module }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b">
      <td className="py-2 pr-4 font-mono">{mod.code}</td>
      <td className="py-2 pr-4">{mod.name}</td>
      <td className="py-2 pr-4">{mod.status === "ACTIVE" ? "Active" : "Inactive"}</td>
      <td className="py-2 space-x-2">
        <Link
          href={`/admin/catalogue/modules/${mod.id}/edit`}
          className="text-blue-600 underline text-sm"
        >
          Edit
        </Link>
        {mod.status === "ACTIVE" && (
          <button
            onClick={() => startTransition(() => markModuleInactiveAction(mod.id))}
            disabled={pending}
            className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Mark inactive
          </button>
        )}
      </td>
    </tr>
  );
}
