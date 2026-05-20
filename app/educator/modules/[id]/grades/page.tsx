import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { GradesForm } from "./grades-form";
import { Chip } from "@/components/ui/chip";

export default async function EducatorGradesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { account } = await requireAuthPage({ roles: ["EDUCATOR"] });

  const mo = await prisma.moduleOffering.findUnique({
    where: { id, primaryEducatorId: account.id },
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
  const weightOk = Math.round(totalWeight) === 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href={`/educator/modules/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        {mo.templateModule.module.name}
      </Link>

      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          Grades &amp; Assessment
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>{mo.templateModule.module.name}</p>
      </div>

      {components.length > 0 && (
        <div style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid var(--line-2)", background: "var(--surface-2)" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>Assessment Structure</span>
            <Chip variant={weightOk ? "ok" : "warn"} size="sm">Total weight: {totalWeight}%</Chip>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
                <th style={{ padding: "10px 18px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Component</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Type</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Weight</th>
                <th style={{ padding: "10px 18px 10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Max Mark</th>
              </tr>
            </thead>
            <tbody>
              {components.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                  <td style={{ padding: "10px 18px", fontWeight: 600, color: "var(--ink)" }}>{c.title}</td>
                  <td style={{ padding: "10px 8px", color: "var(--ink-3)", fontSize: 12 }}>{c.type.replace("_", " ")}</td>
                  <td style={{ padding: "10px 8px", color: "var(--ink-2)" }}>{c.weightPercent}%</td>
                  <td style={{ padding: "10px 18px 10px 8px", color: "var(--ink-2)" }}>{c.maximumMark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
        canReleaseFinalGrades={weightOk}
      />
    </div>
  );
}
