"use client";

import { useTransition } from "react";
import { markFacultyInactiveAction } from "@/lib/actions/catalogue-action";
import Link from "next/link";

type Faculty = { id: string; name: string; status: string };

export function FacultyRow({ faculty }: { faculty: Faculty }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b">
      <td className="py-2 pr-4">{faculty.name}</td>
      <td className="py-2 pr-4">{faculty.status === "ACTIVE" ? "Active" : "Inactive"}</td>
      <td className="py-2 space-x-2">
        <Link
          href={`/administrator/catalogue/faculties/${faculty.id}/edit`}
          className="text-blue-600 underline text-sm"
        >
          Edit
        </Link>
        {faculty.status === "ACTIVE" && (
          <button
            onClick={() => startTransition(() => markFacultyInactiveAction(faculty.id))}
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
