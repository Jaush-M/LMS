import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AssignmentActionsForm } from "./assignment-actions-form";

export default async function EducatorAssignmentDetailPage({ params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const { id, assignmentId } = await params;

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
    include: { templateModule: { include: { module: true } } },
  });
  if (!mo) notFound();

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId, moduleOfferingId: id },
    include: {
      submissions: {
        include: {
          student: { include: { user: { select: { name: true } } } },
          fileAsset: { select: { originalFilename: true } },
        },
        orderBy: { submittedAt: "asc" },
      },
      deadlineExtensions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!assignment) notFound();

  const latestDeadline = assignment.deadlineExtensions[0]?.newDeadline ?? assignment.deadline;

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{assignment.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Due {latestDeadline.toLocaleDateString()} · Max {assignment.maximumMark} marks
            {assignment.deadlineExtensions.length > 0 && " · Deadline extended"}
          </p>
        </div>
        <Link href={`/educator/modules/${id}/assignments`} className="text-sm text-blue-600 underline">Back</Link>
      </div>

      <AssignmentActionsForm
        moduleOfferingId={id}
        assignmentId={assignmentId}
        isPublished={assignment.status === "PUBLISHED"}
        currentDeadline={latestDeadline.toISOString().slice(0, 16)}
      />

      <div className="mt-6">
        <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: assignment.body }} />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Submissions ({assignment.submissions.length})</h2>
        {assignment.submissions.length === 0 ? (
          <p className="text-sm text-gray-500">No submissions yet.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-medium">Student</th>
                <th className="py-2 pr-4 font-medium">File</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {assignment.submissions.map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="py-2 pr-4">{s.student.user.name} ({s.student.generatedIdentifier})</td>
                  <td className="py-2 pr-4 text-xs font-mono">{s.fileAsset.originalFilename}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.status === "MARKED" ? "bg-green-100 text-green-700" : s.status === "LATE" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-gray-500">{s.submittedAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
