"use client";

import { useTransition } from "react";
import { markCourseInactiveAction } from "@/lib/actions/catalogue-action";
import Link from "next/link";
import { Chip } from "@/components/ui/chip";

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
    <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
      <td style={{ padding: "10px 18px", fontFamily: "monospace", fontSize: 12, color: "var(--ink-3)" }}>{course.code}</td>
      <td style={{ padding: "10px 8px", fontWeight: 600, color: "var(--ink)" }}>{course.name}</td>
      <td style={{ padding: "10px 8px", color: "var(--ink-2)" }}>{AWARD_LEVEL_LABEL[course.awardLevel] ?? course.awardLevel}</td>
      <td style={{ padding: "10px 8px", color: "var(--ink-2)" }}>{course.faculty.name}</td>
      <td style={{ padding: "10px 8px" }}>
        <Chip variant={course.status === "ACTIVE" ? "ok" : "default"} size="sm">{course.status === "ACTIVE" ? "Active" : "Inactive"}</Chip>
      </td>
      <td style={{ padding: "10px 18px 10px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href={`/admin/catalogue/courses/${course.id}/edit`} style={{ fontSize: 13, fontWeight: 600, color: "var(--primary-strong)", textDecoration: "none" }}>Edit</Link>
          {course.status === "ACTIVE" && (
            <button
              onClick={() => startTransition(() => markCourseInactiveAction(course.id))}
              disabled={pending}
              style={{ padding: "4px 10px", borderRadius: 7, border: "1px solid var(--warn)", background: "var(--warn-soft)", color: "var(--warn)", fontSize: 12, fontWeight: 600, cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1 }}
            >
              Mark inactive
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
