import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Lock } from "lucide-react";
import { isAttendanceLocked } from "@/lib/attendance";
import { AttendanceForm } from "./attendance-form";
import { Banner } from "@/components/ui/banner";

export default async function AttendancePage({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = await params;
  const { account } = await requireAuthPage({ roles: ["EDUCATOR"] });

  const mo = await prisma.moduleOffering.findUnique({
    where: { id, primaryEducatorId: account.id },
    include: { templateModule: { include: { module: true } } },
  });
  if (!mo) notFound();

  const classSession = await prisma.classSession.findUnique({
    where: { id: sessionId, moduleOfferingId: id },
    include: { sessionType: true, educatorAttendance: true },
  });
  if (!classSession) notFound();

  const locked = classSession.educatorAttendance ? await isAttendanceLocked(sessionId) : false;

  const enrollments = await prisma.enrollment.findMany({
    where: { courseOfferingId: mo.courseOfferingId, status: "ACTIVE" },
    include: { student: { include: { user: { select: { name: true } } } } },
  });

  const existing = await prisma.attendanceRecord.findMany({
    where: { classSessionId: sessionId },
  });
  const existingMap = new Map(existing.map((r) => [r.studentId, r]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href={`/educator/modules/${id}/sessions`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        Sessions
      </Link>

      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          Attendance
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
          {classSession.sessionType.name}
          {" · "}
          {classSession.startAt.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" })}
          {classSession.sessionLocation && ` · ${classSession.sessionLocation}`}
        </p>
      </div>

      {locked && (
        <Banner variant="info" icon={<Lock size={14} />}>
          Attendance is locked — the correction window has passed.
        </Banner>
      )}

      <AttendanceForm
        classSessionId={sessionId}
        moduleOfferingId={id}
        isLocked={locked}
        students={enrollments.map((e) => ({
          id: e.studentId,
          name: e.student.user.name,
          identifier: e.student.generatedIdentifier,
          currentStatus: (existingMap.get(e.studentId)?.status ?? null) as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | null,
        }))}
      />
    </div>
  );
}
