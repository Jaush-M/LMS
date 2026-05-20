import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAttendanceLocked } from "@/lib/attendance";

export default async function EducatorSessionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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
    <main className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Sessions — {mo.templateModule.module.name}</h1>
        <Link href={`/educator/modules/${id}`} className="text-sm text-blue-600 underline">Back to module</Link>
      </div>

      {classSessions.length === 0 ? (
        <p className="text-sm text-gray-500">No class sessions scheduled.</p>
      ) : (
        <ul className="space-y-3">
          {classSessions.map((s) => {
            const submitted = !!s.educatorAttendance;
            const locked = lockedMap.get(s.id) ?? false;
            return (
              <li key={s.id} className="flex items-center justify-between rounded border border-gray-200 bg-white px-5 py-4">
                <div>
                  <p className="font-medium text-gray-800">{s.sessionType.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {s.startAt.toLocaleDateString()} {s.startAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {s.sessionLocation && ` · ${s.sessionLocation}`}
                  </p>
                  {submitted && (
                    <p className="text-xs mt-0.5 text-gray-400">{s._count.attendanceRecords} record{s._count.attendanceRecords !== 1 ? "s" : ""}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {locked && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Locked</span>}
                  {!submitted && (
                    <Link
                      href={`/educator/modules/${id}/sessions/${s.id}/attendance`}
                      className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Submit Attendance
                    </Link>
                  )}
                  {submitted && !locked && (
                    <Link
                      href={`/educator/modules/${id}/sessions/${s.id}/attendance`}
                      className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      View / Correct
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
