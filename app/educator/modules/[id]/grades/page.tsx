import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { GradesForm } from "./grades-form";

export default async function EducatorGradesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { id: true, role: true, mustChangePassword: true },
  });
  if (!actor || actor.role !== "EDUCATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const mo = await prisma.moduleOffering.findUnique({
    where: { id, primaryEducatorId: actor.id },
    include: { templateModule: { include: { module: true } }, courseOffering: true },
  });
  if (!mo) notFound();

  const components = await prisma.assessmentComponent.findMany({
    where: { moduleOfferingId: id },
    orderBy: { sortOrder: "asc" },
    include: { componentMarks: { include: { student: { include: { user: { select: { name: true } } } } } } },
  });

  const enrollments = await prisma.enrollment.findMany({
    where: { courseOfferingId: mo.courseOfferingId, status: "ACTIVE" },
    include: { student: { include: { user: { select: { name: true } } } } },
  });

  const finalGrades = await prisma.finalGrade.findMany({
    where: { moduleOfferingId: id },
  });

  const totalWeight = components.reduce((sum, c) => sum + c.weightPercent, 0);

  return (
    <main className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Grades & Assessment — {mo.templateModule.module.name}</h1>
        <Link href={`/educator/modules/${id}`} className="text-sm text-blue-600 underline">Back to module</Link>
      </div>

      {/* Assessment components summary */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Assessment Structure</h2>
          <span className={`text-sm font-medium ${Math.round(totalWeight) === 100 ? "text-green-600" : "text-yellow-600"}`}>
            Total weight: {totalWeight}%
          </span>
        </div>
        <table className="w-full text-sm border-collapse mb-3">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4 font-medium">Component</th>
              <th className="py-2 pr-4 font-medium">Type</th>
              <th className="py-2 pr-4 font-medium">Weight</th>
              <th className="py-2 font-medium">Max Mark</th>
            </tr>
          </thead>
          <tbody>
            {components.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="py-2 pr-4">{c.title}</td>
                <td className="py-2 pr-4 text-xs text-gray-500">{c.type.replace("_", " ")}</td>
                <td className="py-2 pr-4">{c.weightPercent}%</td>
                <td className="py-2">{c.maximumMark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Mark entry and release */}
      <GradesForm
        moduleOfferingId={id}
        components={components.map((c) => ({
          id: c.id,
          title: c.title,
          maximumMark: c.maximumMark,
          componentMarks: c.componentMarks.map((m) => ({
            id: m.id,
            studentId: m.studentId,
            studentName: m.student.user.name,
            score: m.score,
            status: m.status,
          })),
        }))}
        students={enrollments.map((e) => ({ id: e.studentId, name: e.student.user.name }))}
        finalGrades={finalGrades.map((g) => ({ studentId: g.studentId, percentage: g.percentage, isPassing: g.isPassing, status: g.status }))}
        canReleaseFinalGrades={Math.round(totalWeight) === 100}
      />
    </main>
  );
}
