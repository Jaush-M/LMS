import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CheckCircle } from "lucide-react";
import { FeedbackForm } from "./feedback-form";
import { Banner } from "@/components/ui/banner";
import { EmptyState } from "@/components/ui/empty";

export default async function StudentFeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { account } = await requireAuthPage({ roles: ["STUDENT"] });

  const mo = await prisma.moduleOffering.findUnique({
    where: { id },
    include: { templateModule: { include: { module: true } } },
  });
  if (!mo) notFound();

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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href={`/student/modules/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        {mo.templateModule.module.name}
      </Link>

      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          Module Feedback
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>{mo.templateModule.module.name}</p>
      </div>

      {!period && (
        <EmptyState title="No feedback period open" body="Your educator hasn't opened a feedback period for this module yet." />
      )}

      {period && !isOpen && !existing && (
        <Banner variant="info">
          The feedback period is not currently open ({period.openAt.toLocaleDateString("en", { day: "numeric", month: "short" })} – {period.closeAt.toLocaleDateString("en", { day: "numeric", month: "short" })}).
        </Banner>
      )}

      {existing && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            padding: "16px 20px",
            borderRadius: 14,
            border: "1px solid var(--ok-soft)",
            background: "var(--ok-soft)",
          }}
        >
          <CheckCircle size={20} style={{ color: "var(--ok)", flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ok)" }}>Feedback submitted</div>
            <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 3 }}>
              Rating: {existing.rating}/5
              {existing.comment && ` · "${existing.comment}"`}
            </div>
          </div>
        </div>
      )}

      {period && isOpen && !existing && (
        <div
          style={{
            padding: 20,
            borderRadius: 16,
            border: "1px solid var(--line)",
            background: "var(--surface)",
          }}
        >
          <FeedbackForm moduleOfferingId={id} />
        </div>
      )}
    </div>
  );
}
