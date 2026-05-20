"use client";

import { useTransition } from "react";
import { markIntakeInactiveAction } from "@/lib/actions/catalogue-action";
import Link from "next/link";

type Intake = { id: string; name: string; status: string };

export function IntakeRow({ intake }: { intake: Intake }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b">
      <td className="py-2 pr-4">{intake.name}</td>
      <td className="py-2 pr-4">{intake.status === "ACTIVE" ? "Active" : "Inactive"}</td>
      <td className="py-2 space-x-2">
        <Link
          href={`/admin/catalogue/intakes/${intake.id}/edit`}
          className="text-blue-600 underline text-sm"
        >
          Edit
        </Link>
        {intake.status === "ACTIVE" && (
          <button
            onClick={() => startTransition(() => markIntakeInactiveAction(intake.id))}
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
