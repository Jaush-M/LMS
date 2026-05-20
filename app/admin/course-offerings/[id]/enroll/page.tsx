import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { EnrollStudentForm } from "./enroll-form";

export default async function EnrollStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireAuthPage({ minRole: "ADMINISTRATOR" });

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
  if (offering.status === "ARCHIVED") redirect(`/admin/course-offerings/${id}`);

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
        <Link href={`/admin/course-offerings/${id}`} className="text-sm text-blue-600 underline">
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
