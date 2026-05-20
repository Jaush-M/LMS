import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { getFeedbackReport } from "@/lib/module-feedback";
import { Chip } from "@/components/ui/chip";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";

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
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Link href={`/educator/modules/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
          <ChevronLeft size={15} />
          {mo.templateModule.module.name}
        </Link>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>Feedback</h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>{mo.templateModule.module.name}</p>
        </div>
        <EmptyState title="No feedback period" body="No feedback period has been opened for this module yet." />
      </div>
    );
  }

  const now = new Date();
  const isOpen = now >= period.openAt && now <= period.closeAt;

  let report: Awaited<ReturnType<typeof getFeedbackReport>> | null;
  try {
    report = await getFeedbackReport({ moduleOfferingId: id, requesterId: account.id });
  } catch {
    report = null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href={`/educator/modules/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        {mo.templateModule.module.name}
      </Link>

      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>Feedback</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>{mo.templateModule.module.name}</p>
      </div>

      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 500 }}>Feedback Period</p>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginTop: 3 }}>
              {period.openAt.toLocaleDateString()} – {period.closeAt.toLocaleDateString()}
            </p>
          </div>
          <Chip variant={isOpen ? "ok" : "default"} size="sm">{isOpen ? "Open" : "Closed"}</Chip>
        </div>
      </Card>

      {report && "averageRating" in report ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Card>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 32, fontWeight: 800, color: "var(--ink)", fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}>
                  {report.averageRating.toFixed(1)}
                </p>
                <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4 }}>Average Rating / 5</p>
              </div>
            </Card>
            <Card>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 32, fontWeight: 800, color: "var(--ink)", fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}>
                  {report.responseCount}
                </p>
                <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4 }}>Responses</p>
              </div>
            </Card>
          </div>

          {report.comments.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <MessageSquare size={14} style={{ color: "var(--primary-strong)" }} />
                <h2 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>Student Comments</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {report.comments.map((comment, i) => (
                  <Card key={i}>
                    <p style={{ fontSize: 13.5, color: "var(--ink-2)", fontStyle: "italic", lineHeight: 1.55 }}>
                      &ldquo;{comment}&rdquo;
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState title="No results yet" body="Feedback data will appear here once responses have been collected." />
      )}
    </div>
  );
}
