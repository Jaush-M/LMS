import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAttendanceLocked } from "@/lib/attendance";
import { AttendanceForm } from "./attendance-form";

export default async function AttendancePage({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { id: true, role: true, mustChangePassword: true },
  });
  if (!actor || actor.role !== "EDUCATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const mo = await prisma.moduleOffering.findUnique({
    where: { id, primaryEducatorId: actor.id },
    include: { templateModule: { include: { module: true } } },
  });
  if (!mo) notFound();

  const classSession = await prisma.classSession.findUnique({
    where: { id: sessionId, moduleOfferingId: id },
    include: { sessionType: true, educatorAttendance: true },
  });
  if (!classSession) notFound();

  const locked = classSession.educatorAttendance ? await isAttendanceLocked(sessionId) : false;

  // Enrolled students with effective access
  const enrollments = await prisma.enrollment.findMany({
    where: { courseOfferingId: mo.courseOfferingId, status: "ACTIVE" },
    include: { student: { include: { user: { select: { name: true } } } } },
  });

  const existing = await prisma.attendanceRecord.findMany({
    where: { classSessionId: sessionId },
  });
  const existingMap = new Map(existing.map((r) => [r.studentId, r]));

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">
            {classSession.sessionType.name} · {classSession.startAt.toLocaleDateString()}
            {classSession.sessionLocation && ` · ${classSession.sessionLocation}`}
          </p>
        </div>
        <Link href={`/educator/modules/${id}/sessions`} className="text-sm text-blue-600 underline">Back to sessions</Link>
      </div>

      {locked && (
        <p className="mb-4 rounded bg-gray-100 px-4 py-2 text-sm text-gray-600">
          Attendance is locked — the correction window has passed.
        </p>
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
    </main>
  );
}
