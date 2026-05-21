import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Lock, CheckCircle, Clock } from "lucide-react";
import { isAttendanceLocked } from "@/lib/attendance";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty";
import { ScheduleSessionForm } from "./schedule-session-form";

export default async function EducatorSessionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { account } = await requireAuthPage({ roles: ["EDUCATOR"] });

  const mo = await prisma.moduleOffering.findUnique({
    where: { id, primaryEducatorId: account.id },
    include: { templateModule: { include: { module: true } } },
  });
  if (!mo) notFound();

  const sessionTypes = await prisma.sessionType.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

  const classSessions = await prisma.classSession.findMany({
    where: { moduleOfferingId: id },
    include: {
      sessionType: true,
      educatorAttendance: true,
      _count: { select: { attendanceRecords: true } },
    },
    orderBy: { startAt: "desc" },
  });

  const lockedMap = new Map<string, boolean>();
  for (const s of classSessions) {
    if (s.educatorAttendance) {
      lockedMap.set(s.id, await isAttendanceLocked(s.id));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href={`/educator/modules/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        {mo.templateModule.module.name}
      </Link>

      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          Class Sessions
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>{mo.templateModule.module.name}</p>
      </div>

      <Card>
        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", marginBottom: 14 }}>Schedule a Session</div>
        <ScheduleSessionForm moduleOfferingId={id} sessionTypes={sessionTypes} />
      </Card>

      {classSessions.length === 0 ? (
        <EmptyState title="No sessions scheduled" body="Class sessions will appear here once added." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {classSessions.map((s) => {
            const submitted = !!s.educatorAttendance;
            const locked = lockedMap.get(s.id) ?? false;
            return (
              <Card key={s.id}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        display: "grid",
                        placeItems: "center",
                        background: submitted ? (locked ? "var(--surface-3)" : "var(--ok-soft)") : "var(--warn-soft)",
                        color: submitted ? (locked ? "var(--ink-4)" : "var(--ok)") : "var(--warn)",
                        flexShrink: 0,
                      }}
                    >
                      {locked ? <Lock size={15} /> : submitted ? <CheckCircle size={15} /> : <Clock size={15} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{s.sessionType.name}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                        {s.startAt.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" })}
                        {" "}
                        {s.startAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {s.sessionLocation && ` · ${s.sessionLocation}`}
                        {submitted && ` · ${s._count.attendanceRecords} record${s._count.attendanceRecords !== 1 ? "s" : ""}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {locked && <Chip variant="default" size="sm">Locked</Chip>}
                    {!submitted && (
                      <Link
                        href={`/educator/modules/${id}/sessions/${s.id}/attendance`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "6px 14px",
                          borderRadius: 9,
                          background: "var(--primary-strong)",
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        Submit Attendance
                      </Link>
                    )}
                    {submitted && !locked && (
                      <Link
                        href={`/educator/modules/${id}/sessions/${s.id}/attendance`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "6px 14px",
                          borderRadius: 9,
                          border: "1px solid var(--line)",
                          background: "var(--surface)",
                          color: "var(--ink-2)",
                          fontSize: 13,
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        View / Correct
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
