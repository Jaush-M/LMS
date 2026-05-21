import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AssignmentActionsForm } from "./assignment-actions-form";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty";

export default async function EducatorAssignmentDetailPage({ params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const { id, assignmentId } = await params;
  const { account } = await requireAuthPage({ roles: ["EDUCATOR"] });

  const mo = await prisma.moduleOffering.findUnique({
    where: { id, primaryEducatorId: account.id },
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
      extensionRequests: {
        include: { requestedBy: { include: { user: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!assignment) notFound();

  const latestDeadline = assignment.deadlineExtensions[0]?.newDeadline ?? assignment.deadline;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href={`/educator/modules/${id}/assignments`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        Assignments
      </Link>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
            {assignment.title}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
            Due {latestDeadline.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" })}
            {" · "}Max {assignment.maximumMark} marks
            {assignment.deadlineExtensions.length > 0 && " · Deadline extended"}
          </p>
        </div>
        <Chip variant={assignment.status === "PUBLISHED" ? "ok" : "default"} size="sm">{assignment.status}</Chip>
      </div>

      <AssignmentActionsForm
        moduleOfferingId={id}
        assignmentId={assignmentId}
        isPublished={assignment.status === "PUBLISHED"}
        currentDeadline={latestDeadline.toISOString().slice(0, 16)}
      />

      {assignment.body && (
        <div style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", padding: "18px 20px" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-3)", marginBottom: 10 }}>Instructions</p>
          <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: assignment.body }} />
        </div>
      )}

      {assignment.extensionRequests.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
            Extension Requests ({assignment.extensionRequests.length})
          </h2>
          <div style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
                  <th style={{ padding: "10px 18px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Student</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Reason</th>
                  <th style={{ padding: "10px 18px 10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Requested</th>
                </tr>
              </thead>
              <tbody>
                {assignment.extensionRequests.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                    <td style={{ padding: "10px 18px" }}>
                      <span style={{ fontWeight: 600, color: "var(--ink)" }}>{r.requestedBy.user.name}</span>
                      <span style={{ fontSize: 11.5, color: "var(--ink-4)", marginLeft: 6 }}>{r.requestedBy.generatedIdentifier}</span>
                    </td>
                    <td style={{ padding: "10px 8px", color: "var(--ink-2)", maxWidth: 300 }}>{r.reason}</td>
                    <td style={{ padding: "10px 18px 10px 8px", fontSize: 12, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                      {r.createdAt.toLocaleDateString("en", { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
          Submissions ({assignment.submissions.length})
        </h2>
        {assignment.submissions.length === 0 ? (
          <EmptyState title="No submissions yet" body="Student submissions will appear here." />
        ) : (
          <div style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
                  <th style={{ padding: "10px 18px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Student</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>File</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Status</th>
                  <th style={{ padding: "10px 18px 10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {assignment.submissions.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                    <td style={{ padding: "10px 18px" }}>
                      <span style={{ fontWeight: 600, color: "var(--ink)" }}>{s.student.user.name}</span>
                      <span style={{ fontSize: 11.5, color: "var(--ink-4)", marginLeft: 6 }}>{s.student.generatedIdentifier}</span>
                    </td>
                    <td style={{ padding: "10px 8px", fontFamily: "monospace", fontSize: 12, color: "var(--ink-2)" }}>{s.fileAsset.originalFilename}</td>
                    <td style={{ padding: "10px 8px" }}>
                      <Chip
                        variant={s.status === "MARKED" ? "ok" : s.status === "LATE" ? "bad" : "default"}
                        size="sm"
                      >
                        {s.status}
                      </Chip>
                    </td>
                    <td style={{ padding: "10px 18px 10px 8px", fontSize: 12, color: "var(--ink-3)" }}>
                      {s.submittedAt.toLocaleDateString("en", { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
