import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href={`/admin/course-offerings/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        {offering.name}
      </Link>

      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          Enroll Student
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>{offering.name}</p>
      </div>

      <div style={{ maxWidth: 520 }}>
        <EnrollStudentForm
          courseOfferingId={id}
          students={students.map((s) => ({ id: s.id, generatedIdentifier: s.generatedIdentifier, name: s.user.name }))}
          currentCount={offering.enrollments.length}
          capacity={offering.capacity}
        />
      </div>
    </div>
  );
}
