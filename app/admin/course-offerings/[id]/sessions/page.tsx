import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

export default async function AdminSessionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true, mustChangePassword: true },
  });
  if (!actor || actor.role !== "ADMINISTRATOR" && actor.role !== "SUPER_ADMINISTRATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

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
    <main className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Class Sessions — {offering.name}</h1>
        <div className="flex gap-3">
          <Link href={`/admin/course-offerings/${id}/sessions/new`} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            + Schedule Session
          </Link>
          <Link href={`/admin/course-offerings/${id}`} className="text-sm text-blue-600 underline self-center">Back</Link>
        </div>
      </div>

      {offering.moduleOfferings.map((mo) => (
        <section key={mo.id} className="mb-8">
          <h2 className="text-base font-semibold text-gray-700 mb-3">{mo.templateModule.module.name}</h2>
          {mo.classSessions.length === 0 ? (
            <p className="text-sm text-gray-500">No sessions scheduled.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Date & Time</th>
                  <th className="py-2 pr-4 font-medium">Location</th>
                  <th className="py-2 font-medium">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {mo.classSessions.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="py-2 pr-4">{s.sessionType.name}</td>
                    <td className="py-2 pr-4">
                      {s.startAt.toLocaleDateString()} {s.startAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{s.sessionLocation ?? "—"}</td>
                    <td className="py-2">
                      {s.educatorAttendance
                        ? <span className="text-xs text-green-600">{s._count.attendanceRecords} submitted</span>
                        : <span className="text-xs text-gray-400">Pending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </main>
  );
}
