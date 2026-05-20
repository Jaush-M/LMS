import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { listFaculties } from "@/lib/catalogue";
import { CourseRow } from "./course-row";
import { CreateCourseForm } from "./create-course-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/empty";

export default async function CoursesPage() {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const [courses, faculties] = await Promise.all([
    prisma.course.findMany({
      include: { faculty: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    listFaculties(),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href="/admin/catalogue" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        Catalogue
      </Link>

      <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>Courses</h1>

      <CreateCourseForm faculties={faculties} />

      {courses.length === 0 ? (
        <EmptyState title="No courses" body="Add your first course using the form above." />
      ) : (
        <div style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
                <th style={{ padding: "10px 18px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Code</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Name</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Award Level</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Faculty</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Status</th>
                <th style={{ padding: "10px 18px 10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <CourseRow key={c.id} course={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
