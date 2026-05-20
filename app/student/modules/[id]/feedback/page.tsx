import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FeedbackForm } from "./feedback-form";

export default async function StudentFeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { account } = await requireAuthPage({ roles: ["STUDENT"] });

  const mo = await prisma.moduleOffering.findUnique({
    where: { id },
    include: { templateModule: { include: { module: true } } },
  });
  if (!mo) notFound();

  // Verify enrollment
  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: account.id, courseOfferingId: mo.courseOfferingId, status: "ACTIVE" },
  });
  if (!enrollment) notFound();

  const period = await prisma.feedbackPeriod.findUnique({ where: { moduleOfferingId: id } });
  const existing = period
    ? await prisma.feedbackResponse.findUnique({
        where: { feedbackPeriodId_studentId: { feedbackPeriodId: period.id, studentId: account.id } },
      })
    : null;

  const now = new Date();
  const isOpen = period ? now >= period.openAt && now <= period.closeAt : false;

  return (
    <main className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Module Feedback — {mo.templateModule.module.name}</h1>
        <Link href={`/student/modules/${id}`} className="text-sm text-blue-600 underline">Back</Link>
      </div>

      {!period && (
        <p className="text-sm text-gray-500">No feedback period is open for this module yet.</p>
      )}

      {period && !isOpen && !existing && (
        <p className="text-sm text-gray-500">
          The feedback period ({period.openAt.toLocaleDateString()} – {period.closeAt.toLocaleDateString()}) is not currently open.
        </p>
      )}

      {existing && (
        <div className="rounded border border-green-200 bg-green-50 px-5 py-4">
          <p className="text-sm font-medium text-green-700">Your feedback has been submitted.</p>
          <p className="text-sm text-green-600 mt-1">Rating: {existing.rating}/5</p>
          {existing.comment && <p className="text-sm text-green-600 italic mt-1">"{existing.comment}"</p>}
        </div>
      )}

      {period && isOpen && !existing && (
        <FeedbackForm moduleOfferingId={id} />
      )}
    </main>
  );
}
