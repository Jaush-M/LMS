import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { listCourses, listFaculties } from "@/lib/catalogue";
import { CourseRow } from "./course-row";
import { CreateCourseForm } from "./create-course-form";
import Link from "next/link";

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
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/catalogue" className="text-sm text-gray-500 hover:underline">
          ← Catalogue
        </Link>
        <h1 className="text-2xl font-semibold">Courses</h1>
      </div>

      <CreateCourseForm faculties={faculties} />

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4 font-medium">Code</th>
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Award level</th>
              <th className="py-2 pr-4 font-medium">Faculty</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <CourseRow key={c.id} course={c} />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
