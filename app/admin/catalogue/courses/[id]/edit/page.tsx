import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { listFaculties } from "@/lib/catalogue";
import { EditCourseForm } from "./edit-course-form";
import Link from "next/link";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const { id } = await params;
  const [course, faculties] = await Promise.all([
    prisma.course.findUnique({ where: { id } }),
    listFaculties(),
  ]);
  if (!course) notFound();

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/catalogue/courses" className="text-sm text-gray-500 hover:underline">
          ← Courses
        </Link>
        <h1 className="text-2xl font-semibold">Edit Course</h1>
      </div>
      <p className="text-sm text-gray-500">
        Code: <span className="font-mono font-medium">{course.code}</span>
      </p>
      <EditCourseForm course={course} faculties={faculties} />
    </main>
  );
}
