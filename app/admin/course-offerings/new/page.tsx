import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreateCourseOfferingForm } from "./create-form";

export default async function NewCourseOfferingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true, mustChangePassword: true },
  });
  if (!actor || actor.role !== "ADMINISTRATOR" && actor.role !== "SUPER_ADMINISTRATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const [courses, educators, intakes, studyModes] = await Promise.all([
    prisma.course.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        code: true,
        name: true,
        curriculumTemplate: {
          select: {
            id: true,
            templateModules: {
              select: {
                id: true,
                sortOrder: true,
                module: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.userAccount.findMany({
      where: { role: "EDUCATOR", status: "ACTIVE" },
      include: { user: { select: { name: true } } },
      orderBy: { generatedIdentifier: "asc" },
    }),
    prisma.intake.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.studyMode.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="p-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold">Create Course Offering</h1>
        <Link href="/admin/course-offerings" className="text-sm text-blue-600 underline">
          Back to Course Offerings
        </Link>
      </div>

      <CreateCourseOfferingForm
        courses={courses}
        educators={educators.map((e) => ({
          id: e.id,
          generatedIdentifier: e.generatedIdentifier,
          name: e.user.name,
        }))}
        intakes={intakes}
        studyModes={studyModes}
      />
    </main>
  );
}
