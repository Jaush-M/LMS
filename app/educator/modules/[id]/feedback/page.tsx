import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getFeedbackReport } from "@/lib/module-feedback";

export default async function EducatorFeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { account } = await requireAuthPage({ roles: ["EDUCATOR"] });

  const mo = await prisma.moduleOffering.findUnique({
    where: { id, primaryEducatorId: account.id },
    include: { templateModule: { include: { module: true } } },
  });
  if (!mo) notFound();

  const period = await prisma.feedbackPeriod.findUnique({ where: { moduleOfferingId: id } });

  if (!period) {
    return (
      <main className="p-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Feedback — {mo.templateModule.module.name}</h1>
          <Link href={`/educator/modules/${id}`} className="text-sm text-blue-600 underline">Back</Link>
        </div>
        <p className="text-sm text-gray-500">No feedback period has been opened for this module yet.</p>
      </main>
    );
  }

  const now = new Date();
  const isOpen = now >= period.openAt && now <= period.closeAt;

  let report;
  try {
    report = await getFeedbackReport({ moduleOfferingId: id, requesterId: account.id });
  } catch {
    report = null;
  }

  return (
    <main className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Feedback — {mo.templateModule.module.name}</h1>
        <Link href={`/educator/modules/${id}`} className="text-sm text-blue-600 underline">Back</Link>
      </div>

      <div className="mb-6 rounded border border-gray-200 bg-white px-5 py-4 text-sm">
        <p><span className="font-medium">Period:</span> {period.openAt.toLocaleDateString()} – {period.closeAt.toLocaleDateString()}</p>
        <p className="mt-1">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {isOpen ? "Open" : "Closed"}
          </span>
        </p>
      </div>

      {report && "averageRating" in report && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded border border-gray-200 bg-white px-5 py-4 text-center">
              <p className="text-3xl font-bold text-gray-800">{report.averageRating.toFixed(1)}</p>
              <p className="text-sm text-gray-500 mt-1">Average Rating / 5</p>
            </div>
            <div className="rounded border border-gray-200 bg-white px-5 py-4 text-center">
              <p className="text-3xl font-bold text-gray-800">{report.responseCount}</p>
              <p className="text-sm text-gray-500 mt-1">Responses</p>
            </div>
          </div>

          {report.comments.length > 0 && (
            <section>
              <h2 className="text-base font-semibold mb-2">Comments</h2>
              <ul className="space-y-2">
                {report.comments.map((comment, i) => (
                  <li key={i} className="rounded border border-gray-200 bg-white px-5 py-3 text-sm text-gray-700 italic">
                    "{comment}"
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
