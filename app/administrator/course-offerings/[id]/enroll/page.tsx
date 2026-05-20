import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { EnrollStudentForm } from "./enroll-form";

export default async function EnrollStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true, mustChangePassword: true },
  });
  if (!actor || actor.role !== "ADMINISTRATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const offering = await prisma.courseOffering.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      capacity: true,
      status: true,
      enrollments: { where: { status: "ACTIVE" }, select: { studentId: true } },
    },
  });
  if (!offering) notFound();
  if (offering.status === "ARCHIVED") redirect(`/administrator/course-offerings/${id}`);

  const enrolledStudentIds = new Set(offering.enrollments.map((e) => e.studentId));

  const students = await prisma.userAccount.findMany({
    where: {
      role: "STUDENT",
      status: "ACTIVE",
      id: { notIn: [...enrolledStudentIds] },
    },
    include: { user: { select: { name: true } } },
    orderBy: { generatedIdentifier: "asc" },
  });

  return (
    <main className="p-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold">Enroll Student</h1>
        <Link href={`/administrator/course-offerings/${id}`} className="text-sm text-blue-600 underline">
          Back to {offering.name}
        </Link>
      </div>

      <EnrollStudentForm
        courseOfferingId={id}
        students={students.map((s) => ({ id: s.id, generatedIdentifier: s.generatedIdentifier, name: s.user.name }))}
        currentCount={offering.enrollments.length}
        capacity={offering.capacity}
      />
    </main>
  );
}
