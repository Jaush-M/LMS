import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { listFaculties } from "@/lib/catalogue";
import { EditCourseForm } from "./edit-course-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const { id } = await params;
  const [course, faculties] = await Promise.all([
    prisma.course.findUnique({ where: { id } }),
    listFaculties(),
  ]);
  if (!course) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href="/admin/catalogue/courses" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        Courses
      </Link>
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>Edit Course</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>Code: <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{course.code}</span></p>
      </div>
      <div style={{ maxWidth: 520 }}>
        <EditCourseForm course={course} faculties={faculties} />
      </div>
    </div>
  );
}
