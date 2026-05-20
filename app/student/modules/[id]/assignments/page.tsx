import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { listAssignments } from "@/lib/assignments";

export default async function StudentAssignmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { account } = await requireAuthPage({ roles: ["STUDENT"] });

  const mo = await prisma.moduleOffering.findUnique({
    where: { id },
    include: { templateModule: { include: { module: true } } },
  });
  if (!mo) notFound();

  let assignments;
  try {
    assignments = await listAssignments({ moduleOfferingId: id, viewerId: account.id });
  } catch {
    notFound();
  }

  const mySubmissions = await prisma.assignmentSubmission.findMany({
    where: { studentId: account.id, assignmentId: { in: assignments.map((a) => a.id) } },
  });
  const submissionMap = new Map(mySubmissions.map((s) => [s.assignmentId, s]));

  const myMarks = await prisma.componentMark.findMany({
    where: { studentId: account.id, status: "RELEASED", assessmentComponent: { moduleOfferingId: id } },
    include: { assessmentComponent: { select: { title: true, weightPercent: true, maximumMark: true } } },
  });

  const myFinalGrade = await prisma.finalGrade.findUnique({
    where: { moduleOfferingId_studentId: { moduleOfferingId: id, studentId: account.id } },
  });

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Assignments — {mo.templateModule.module.name}</h1>
        <Link href={`/student/modules/${id}`} className="text-sm text-blue-600 underline">Back to module</Link>
      </div>

      {/* Assignments list */}
      {assignments.length === 0 ? (
        <p className="text-sm text-gray-500">No assignments published yet.</p>
      ) : (
        <ul className="space-y-3 mb-8">
          {assignments.map((a) => {
            const sub = submissionMap.get(a.id);
            return (
              <li key={a.id} className="rounded border border-gray-200 bg-white px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-800">{a.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Due {a.deadline.toLocaleDateString()} · Max {a.maximumMark} marks</p>
                    <div className="mt-2 text-sm text-gray-600 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: a.body }} />
                  </div>
                  <div className="shrink-0 text-right">
                    {sub ? (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${sub.status === "MARKED" ? "bg-green-100 text-green-700" : sub.status === "LATE" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                        {sub.status}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Not submitted</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Released marks */}
      {myMarks.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">My Marks</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-medium">Component</th>
                <th className="py-2 pr-4 font-medium">Score</th>
                <th className="py-2 font-medium">Weight</th>
              </tr>
            </thead>
            <tbody>
              {myMarks.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="py-2 pr-4">{m.assessmentComponent.title}</td>
                  <td className="py-2 pr-4">{m.score} / {m.assessmentComponent.maximumMark}</td>
                  <td className="py-2">{m.assessmentComponent.weightPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Final grade */}
      {myFinalGrade && (
        <section className="rounded border border-gray-200 bg-white px-5 py-4">
          <h2 className="font-semibold mb-1">Final Grade</h2>
          <p className="text-2xl font-bold {myFinalGrade.isPassing ? 'text-green-600' : 'text-red-600'}">
            {myFinalGrade.percentage.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-500">{myFinalGrade.isPassing ? "Pass" : "Fail"}</p>
        </section>
      )}
    </main>
  );
}
