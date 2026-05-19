import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { listFaculties } from "@/lib/catalogue";
import { EditCourseForm } from "./edit-course-form";
import Link from "next/link";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true, mustChangePassword: true },
  });
  if (!actor || actor.role !== "ADMINISTRATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const { id } = await params;
  const [course, faculties] = await Promise.all([
    prisma.course.findUnique({ where: { id } }),
    listFaculties(),
  ]);
  if (!course) notFound();

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/administrator/catalogue/courses" className="text-sm text-gray-500 hover:underline">
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
