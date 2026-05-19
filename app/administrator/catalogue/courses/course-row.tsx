"use client";

import { useTransition } from "react";
import { markCourseInactiveAction } from "@/lib/actions/catalogue-action";
import Link from "next/link";

type Course = {
  id: string;
  code: string;
  name: string;
  awardLevel: string;
  status: string;
  faculty: { name: string };
};

const AWARD_LEVEL_LABEL: Record<string, string> = {
  FOUNDATION: "Foundation",
  DIPLOMA: "Diploma",
  DEGREE: "Degree",
  MASTERS: "Masters",
  PHD: "PhD",
};

export function CourseRow({ course }: { course: Course }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b">
      <td className="py-2 pr-4 font-mono">{course.code}</td>
      <td className="py-2 pr-4">{course.name}</td>
      <td className="py-2 pr-4">{AWARD_LEVEL_LABEL[course.awardLevel] ?? course.awardLevel}</td>
      <td className="py-2 pr-4">{course.faculty.name}</td>
      <td className="py-2 pr-4">{course.status === "ACTIVE" ? "Active" : "Inactive"}</td>
      <td className="py-2 space-x-2">
        <Link
          href={`/administrator/catalogue/courses/${course.id}/edit`}
          className="text-blue-600 underline text-sm"
        >
          Edit
        </Link>
        {course.status === "ACTIVE" && (
          <button
            onClick={() => startTransition(() => markCourseInactiveAction(course.id))}
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
