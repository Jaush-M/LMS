import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus, CheckCircle, Clock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty";

export default async function AdminSessionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const offering = await prisma.courseOffering.findUnique({
    where: { id },
    include: {
      moduleOfferings: {
        include: {
          templateModule: { include: { module: true } },
          classSessions: {
            include: { sessionType: true, educatorAttendance: true, _count: { select: { attendanceRecords: true } } },
            orderBy: { startAt: "desc" },
          },
        },
      },
    },
  });
  if (!offering) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href={`/admin/course-offerings/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        {offering.name}
      </Link>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
            Class Sessions
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>{offering.name}</p>
        </div>
        <Link
          href={`/admin/course-offerings/${id}/sessions/new`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 10,
            background: "var(--primary-strong)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 4px 12px -4px oklch(0.5 0.15 162 / 0.35)",
          }}
        >
          <Plus size={14} />
          Schedule Session
        </Link>
      </div>

      {offering.moduleOfferings.map((mo) => (
        <div key={mo.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {mo.templateModule.module.name}
          </h2>
          {mo.classSessions.length === 0 ? (
            <EmptyState title="No sessions" body="No sessions scheduled for this module." />
          ) : (
            <div style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
                    <th style={{ padding: "10px 18px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Type</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Date &amp; Time</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Location</th>
                    <th style={{ padding: "10px 18px 10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {mo.classSessions.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                      <td style={{ padding: "10px 18px", fontWeight: 600, color: "var(--ink)" }}>{s.sessionType.name}</td>
                      <td style={{ padding: "10px 8px", color: "var(--ink-2)" }}>
                        {s.startAt.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" })}
                        {" "}
                        {s.startAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td style={{ padding: "10px 8px", color: "var(--ink-3)", fontSize: 12 }}>{s.sessionLocation ?? "—"}</td>
                      <td style={{ padding: "10px 18px 10px 8px" }}>
                        {s.educatorAttendance ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ok)", fontWeight: 600 }}>
                            <CheckCircle size={12} />
                            {s._count.attendanceRecords} submitted
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink-4)" }}>
                            <Clock size={12} />
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
