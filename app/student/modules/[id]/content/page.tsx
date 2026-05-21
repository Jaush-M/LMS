import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ClipboardList, ExternalLink } from "lucide-react";
import { listModuleContent } from "@/lib/module-content";
import { listAssignments } from "@/lib/assignments";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty";

export default async function StudentContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { account } = await requireAuthPage({ roles: ["STUDENT"] });

  const mo = await prisma.moduleOffering.findUnique({
    where: { id },
    include: { templateModule: { include: { module: true } } },
  });
  if (!mo) notFound();

  let sections;
  try {
    sections = await listModuleContent({ moduleOfferingId: id, viewerId: account.id });
  } catch {
    notFound();
  }

  let assignments: Awaited<ReturnType<typeof listAssignments>> = [];
  try {
    assignments = await listAssignments({ moduleOfferingId: id, viewerId: account.id });
  } catch {
    // no access — skip sidebar
  }

  const mySubmissions = assignments.length > 0
    ? await prisma.assignmentSubmission.findMany({
        where: { studentId: account.id, assignmentId: { in: assignments.map((a) => a.id) } },
      })
    : [];
  const submissionMap = new Map(mySubmissions.map((s) => [s.assignmentId, s]));

  const latestExtensions = assignments.length > 0
    ? await prisma.assignmentDeadlineExtension.findMany({
        where: { assignmentId: { in: assignments.map((a) => a.id) } },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const extensionMap = new Map<string, Date>();
  for (const ext of latestExtensions) {
    if (!extensionMap.has(ext.assignmentId)) extensionMap.set(ext.assignmentId, ext.newDeadline);
  }

  const now = new Date();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href={`/student/modules/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        {mo.templateModule.module.name}
      </Link>

      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          Content
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>{mo.templateModule.module.name}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          {sections.length === 0 ? (
            <EmptyState title="No content yet" body="Your educator hasn't published any content for this module." />
          ) : (
            sections.map((section) => (
              <div key={section.id}>
                <div
                  className="text-[11px] uppercase tracking-[0.1em] font-bold mb-3"
                  style={{ color: "var(--ink-4)" }}
                >
                  {section.title}
                </div>
                {section.contentItems.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--ink-4)" }}>No published items in this section.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {section.contentItems.map((item) => {
                      const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"]);
                      return (
                        <Card key={item.id}>
                          <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--ink)" }}>{item.title}</div>
                          {item.body && (
                            <div
                              className="prose prose-sm max-w-none mt-3"
                              style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.65 }}
                              dangerouslySetInnerHTML={{ __html: item.body }}
                            />
                          )}
                          {item.attachments.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                              {item.attachments.map((att) => {
                                const fileUrl = `/api/files/${encodeURIComponent(att.fileAsset.storageKey)}?preview=1`;
                                const isImage = IMAGE_MIMES.has(att.fileAsset.mimeType);
                                return (
                                  <div key={att.id}>
                                    {isImage ? (
                                      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                        <img
                                          src={fileUrl}
                                          alt={att.fileAsset.originalFilename}
                                          style={{ maxWidth: "100%", borderRadius: 10, display: "block", cursor: "pointer" }}
                                        />
                                      </a>
                                    ) : (
                                      <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--ink-2)", textDecoration: "none" }}
                                      >
                                        <ExternalLink size={13} style={{ flexShrink: 0 }} />
                                        <span style={{ fontFamily: "monospace" }}>{att.fileAsset.originalFilename}</span>
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {assignments.length > 0 && (
          <div className="w-full md:w-[260px] md:flex-shrink-0 md:sticky md:top-[92px] flex flex-col gap-3">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <ClipboardList size={14} style={{ color: "var(--ink-3)" }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                Assignments
              </span>
            </div>
            {assignments.map((a) => {
              const sub = submissionMap.get(a.id);
              const effectiveDeadline = extensionMap.get(a.id) ?? a.deadline;
              const daysLeft = Math.ceil((effectiveDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const isOverdue = !sub && now > effectiveDeadline;
              const urgent = !sub && daysLeft <= 2 && daysLeft >= 0;

              let statusChip: React.ReactNode;
              if (sub?.status === "MARKED") {
                statusChip = <Chip variant="ok" size="sm" dot>Marked</Chip>;
              } else if (sub?.status === "LATE") {
                statusChip = <Chip variant="bad" size="sm" dot>Late</Chip>;
              } else if (sub?.status === "SUBMITTED") {
                statusChip = <Chip variant="lav" size="sm" dot>Submitted</Chip>;
              } else if (isOverdue) {
                statusChip = <Chip variant="bad" size="sm" dot>Overdue</Chip>;
              } else if (daysLeft === 0) {
                statusChip = <Chip variant="bad" size="sm">Due today</Chip>;
              } else if (daysLeft === 1) {
                statusChip = <Chip variant="warn" size="sm">Due tomorrow</Chip>;
              } else {
                statusChip = <Chip variant="warn" size="sm">{daysLeft} days left</Chip>;
              }

              return (
                <Link
                  key={a.id}
                  href={`/student/modules/${id}/assignments`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      borderRadius: 14,
                      border: `1px solid ${urgent || isOverdue ? "color-mix(in srgb, var(--bad) 20%, transparent)" : "var(--line)"}`,
                      background: "var(--surface-card)",
                      padding: "12px 14px",
                      display: "flex", flexDirection: "column", gap: 4,
                      cursor: "pointer",
                    }}
                    className="hover:brightness-95 transition-all"
                  >
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", lineHeight: 1.3 }}>{a.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                      Due {effectiveDeadline.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" })}
                    </div>
                    <div style={{ marginTop: 2 }}>{statusChip}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
