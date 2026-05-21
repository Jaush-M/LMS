import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty";
import { ProgressBar } from "@/components/ui/progress-bar";

export default async function CourseOfferingsPage() {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const offerings = await prisma.courseOffering.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      capacity: true,
      startAt: true,
      finishAt: true,
      course: { select: { code: true, name: true } },
      intake: { select: { name: true } },
      studyMode: { select: { name: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { startAt: "desc" },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
            Course Offerings
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--ink-3)" }}>
            {offerings.length} offering{offerings.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/course-offerings/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 16px",
            borderRadius: 11,
            background: "var(--primary-strong)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 4px 12px -4px oklch(0.5 0.15 162 / 0.45)",
          }}
        >
          <Plus size={15} />
          New offering
        </Link>
      </div>

      {offerings.length === 0 ? (
        <EmptyState title="No course offerings" body="Create your first offering to get started." />
      ) : (
        <Card flush>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {["Name", "Course", "Intake", "Mode", "Enrolled", "Status"].map((h) => (
                    <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontWeight: 700, fontSize: 11.5, color: "var(--ink-4)", letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {offerings.map((o) => {
                  const fillPct = o.capacity > 0 ? Math.min(100, Math.round((o._count.enrollments / o.capacity) * 100)) : 0;
                  return (
                    <tr key={o.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                      <td style={{ padding: "12px 20px" }}>
                        <Link
                          href={`/admin/course-offerings/${o.id}`}
                          style={{ fontWeight: 700, color: "var(--primary-deep)", textDecoration: "none", fontSize: 13.5 }}
                        >
                          {o.name}
                        </Link>
                        <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 1 }}>
                          {o.startAt.toLocaleDateString("en", { month: "short", year: "numeric" })}
                          {" – "}
                          {o.finishAt.toLocaleDateString("en", { month: "short", year: "numeric" })}
                        </div>
                      </td>
                      <td style={{ padding: "12px 20px", fontFamily: "monospace", fontSize: 12, color: "var(--ink-3)" }}>
                        {o.course.code}
                      </td>
                      <td style={{ padding: "12px 20px", color: "var(--ink-2)", fontSize: 12.5 }}>
                        {o.intake.name}
                      </td>
                      <td style={{ padding: "12px 20px", color: "var(--ink-3)", fontSize: 12.5 }}>
                        {o.studyMode.name}
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", flexShrink: 0 }}>
                            {o._count.enrollments}/{o.capacity}
                          </span>
                          <div style={{ flex: 1 }}>
                            <ProgressBar value={fillPct} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <Chip variant={o.status === "ACTIVE" ? "ok" : o.status === "ARCHIVED" || o.status === "CANCELLED" ? "default" : "lav"} dot size="sm">
                          {o.status}
                        </Chip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
