import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getEducatorDashboard } from "@/lib/educator-dashboard";

export default async function EducatorDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const userAccount = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { id: true, role: true, mustChangePassword: true },
  });

  if (!userAccount || userAccount.role !== "EDUCATOR") redirect("/dashboard");
  if (userAccount.mustChangePassword) redirect("/change-password");

  const data = await getEducatorDashboard(userAccount.id);
  const now = new Date();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">Guided Learning Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome, {session.user.name}</p>

        <nav className="mt-3 text-sm text-blue-600 underline">
          <Link href="/educator/academic-calendar">Academic Calendar</Link>
        </nav>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">

          {/* Assigned Module Offerings */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800">My Module Offerings</h2>
            {data.assignedModuleOfferings.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">No module offerings assigned.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {data.assignedModuleOfferings.map((mo) => (
                  <li key={mo.id} className="py-3">
                    <p className="text-sm font-medium text-gray-800">{mo.moduleName}</p>
                    <p className="text-xs text-gray-500">{mo.courseOfferingName}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Pending Marking */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800">
              Pending Marking
              {data.pendingMarking.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  {data.pendingMarking.length}
                </span>
              )}
            </h2>
            {data.pendingMarking.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">No submissions awaiting marking.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {data.pendingMarking.map((item) => (
                  <li key={item.submissionId} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.assignmentTitle}</p>
                        <p className="text-xs text-gray-500">{item.studentName} · {item.moduleName}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                        {item.submittedAt.toLocaleDateString("en-MV", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Upcoming Class Sessions */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800">Upcoming Class Sessions</h2>
            {data.upcomingClassSessions.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">No upcoming class sessions.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {data.upcomingClassSessions.map((s) => (
                  <li key={s.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.moduleName}</p>
                        <p className="text-xs text-gray-500">{s.sessionTypeName}{s.sessionLocation ? ` · ${s.sessionLocation}` : ""}</p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-500">
                        {s.startAt.toLocaleDateString("en-MV", { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Attendance Not Yet Submitted */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800">
              Attendance Not Yet Submitted
              {data.unsubmittedAttendanceSessions.length > 0 && (
                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                  {data.unsubmittedAttendanceSessions.length}
                </span>
              )}
            </h2>
            {data.unsubmittedAttendanceSessions.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">All attendance submitted.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {data.unsubmittedAttendanceSessions.map((s) => (
                  <li key={s.id} className="py-3">
                    <p className="text-sm font-medium text-gray-800">{s.moduleName}</p>
                    <p className="text-xs text-red-500">
                      {s.startAt.toLocaleDateString("en-MV", { weekday: "short", day: "numeric", month: "short" })} — attendance pending
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Unread Mentions */}
          {data.unreadMentions.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800">
                Unread Mentions
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  {data.unreadMentions.length}
                </span>
              </h2>
              <ul className="mt-3 divide-y divide-gray-100">
                {data.unreadMentions.map((m) => (
                  <li key={m.notificationId} className="py-3">
                    <p className="text-sm font-medium text-gray-800">{m.moduleName}</p>
                    <p className="text-xs text-gray-500">
                      {m.createdAt.toLocaleDateString("en-MV", { day: "numeric", month: "short" })}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* At-Risk Students */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:col-span-2">
            <h2 className="font-semibold text-gray-800">
              At-Risk Students
              {data.atRiskStudents.length > 0 && (
                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                  {data.atRiskStudents.length}
                </span>
              )}
            </h2>
            {data.atRiskStudents.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">No at-risk students identified.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {data.atRiskStudents.map((s) => (
                  <li key={`${s.studentId}:${s.moduleOfferingId}`} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.studentName}</p>
                        <p className="text-xs text-gray-500">{s.moduleName}</p>
                      </div>
                      <ul className="flex flex-wrap gap-1.5">
                        {s.reasons.map((r, i) => {
                          let label = "";
                          if (r.kind === "LOW_ATTENDANCE") label = `Attendance ${r.attendancePercentage}%`;
                          else if (r.kind === "OVERDUE_ASSIGNMENT") label = `Overdue: ${r.assignmentTitle}`;
                          else if (r.kind === "FAILED_FINAL_GRADE") label = `Final grade ${r.percentage}%`;
                          return (
                            <li
                              key={i}
                              className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700"
                            >
                              {label}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>
      </div>
    </main>
  );
}
