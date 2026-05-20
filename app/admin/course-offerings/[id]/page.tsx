import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function CourseOfferingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const offering = await prisma.courseOffering.findUnique({
    where: { id },
    include: {
      course: true,
      intake: true,
      studyMode: true,
      moduleOfferings: {
        include: {
          templateModule: { include: { module: true } },
          primaryEducator: { include: { user: { select: { name: true } } } },
        },
        orderBy: { templateModule: { sortOrder: "asc" } },
      },
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          student: { include: { user: { select: { name: true } } } },
          capacityOverride: { select: { reason: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!offering) notFound();

  const enrolledCount = offering.enrollments.length;
  const atCapacity = enrolledCount >= offering.capacity;

  return (
    <main className="p-8 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{offering.name}</h1>
        <Link href="/admin/course-offerings" className="text-sm text-blue-600 underline">
          Back to Course Offerings
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium">Course:</span>{" "}
          {offering.course.code} — {offering.course.name}
        </div>
        <div>
          <span className="font-medium">Intake:</span> {offering.intake.name}
        </div>
        <div>
          <span className="font-medium">Study mode:</span> {offering.studyMode.name}
        </div>
        <div>
          <span className="font-medium">Dates:</span>{" "}
          {offering.startAt.toLocaleDateString()} – {offering.finishAt.toLocaleDateString()}
        </div>
        <div>
          <span className="font-medium">Capacity:</span> {enrolledCount} / {offering.capacity}
          {atCapacity && (
            <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
              Full
            </span>
          )}
        </div>
        <div>
          <span className="font-medium">Status:</span>{" "}
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${offering.status === "ARCHIVED" ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"}`}>
            {offering.status}
          </span>
        </div>
      </section>

      {/* Module Offerings */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Module Offerings</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4 font-medium">Module</th>
              <th className="py-2 pr-4 font-medium">Code</th>
              <th className="py-2 font-medium">Primary Educator</th>
            </tr>
          </thead>
          <tbody>
            {offering.moduleOfferings.map((mo) => (
              <tr key={mo.id} className="border-b">
                <td className="py-2 pr-4">{mo.templateModule.module.name}</td>
                <td className="py-2 pr-4 font-mono text-xs">{mo.templateModule.module.code}</td>
                <td className="py-2">{mo.primaryEducator.user.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Enrolled Students */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Enrolled Students ({enrolledCount})</h2>
          {offering.status !== "ARCHIVED" && (
            <Link
              href={`/admin/course-offerings/${id}/enroll`}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Enroll Student
            </Link>
          )}
        </div>

        {offering.enrollments.length === 0 ? (
          <p className="text-sm text-gray-500">No students enrolled yet.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Identifier</th>
                <th className="py-2 font-medium">Override</th>
              </tr>
            </thead>
            <tbody>
              {offering.enrollments.map((e) => (
                <tr key={e.id} className="border-b">
                  <td className="py-2 pr-4">{e.student.user.name}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{e.student.generatedIdentifier}</td>
                  <td className="py-2 text-xs text-gray-500">
                    {e.capacityOverride ? e.capacityOverride.reason : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
