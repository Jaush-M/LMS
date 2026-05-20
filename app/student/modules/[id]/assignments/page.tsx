import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listAssignments } from "@/lib/assignments";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty";

function submissionChip(status: string) {
  if (status === "MARKED") return <Chip variant="ok" dot>Marked</Chip>;
  if (status === "LATE") return <Chip variant="bad" dot>Late</Chip>;
  if (status === "SUBMITTED") return <Chip variant="lav" dot>Submitted</Chip>;
  return <Chip variant="default" dot>Pending review</Chip>;
}

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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href={`/student/modules/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        {mo.templateModule.module.name}
      </Link>

      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          Assignments
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>{mo.templateModule.module.name}</p>
      </div>

      {assignments.length === 0 ? (
        <EmptyState title="No assignments yet" body="Your educator hasn't published any assignments." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {assignments.map((a) => {
            const sub = submissionMap.get(a.id);
            const now = new Date();
            const isOverdue = !sub && a.deadline < now;
            return (
              <Card key={a.id}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--ink)" }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>
                      Due {a.deadline.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" })} · Max {a.maximumMark} marks
                    </div>
                    {a.body && (
                      <div
                        className="prose prose-sm max-w-none mt-3"
                        style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}
                        dangerouslySetInnerHTML={{ __html: a.body }}
                      />
                    )}
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {sub
                      ? submissionChip(sub.status)
                      : isOverdue
                        ? <Chip variant="bad" dot>Overdue</Chip>
                        : <Chip variant="info">Not submitted</Chip>
                    }
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {myMarks.length > 0 && (
        <Card flush>
          <div style={{ padding: "14px 20px 8px", fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>My Marks</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {["Component", "Score", "Weight"].map((h) => (
                    <th key={h} style={{ padding: "9px 20px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "var(--ink-4)", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myMarks.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                    <td style={{ padding: "10px 20px", color: "var(--ink)" }}>{m.assessmentComponent.title}</td>
                    <td style={{ padding: "10px 20px", fontWeight: 700, color: "var(--ink)" }}>{m.score} / {m.assessmentComponent.maximumMark}</td>
                    <td style={{ padding: "10px 20px", color: "var(--ink-3)" }}>{m.assessmentComponent.weightPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {myFinalGrade && (
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", marginBottom: 8 }}>Final Grade</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 32, fontWeight: 800, fontFamily: "var(--font-display)", color: myFinalGrade.isPassing ? "var(--ok)" : "var(--bad)" }}>
              {myFinalGrade.percentage.toFixed(1)}%
            </span>
            <Chip variant={myFinalGrade.isPassing ? "ok" : "bad"} dot>
              {myFinalGrade.isPassing ? "Pass" : "Fail"}
            </Chip>
          </div>
        </Card>
      )}
    </div>
  );
}
