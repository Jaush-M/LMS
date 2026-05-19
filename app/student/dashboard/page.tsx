import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getStudentDashboard } from "@/lib/student-dashboard";

export default async function StudentDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const userAccount = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { id: true, role: true, mustChangePassword: true },
  });

  if (!userAccount || userAccount.role !== "STUDENT") redirect("/dashboard");
  if (userAccount.mustChangePassword) redirect("/change-password");

  const data = await getStudentDashboard(userAccount.id);

  const now = new Date();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">Guided Learning Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome, {session.user.name}</p>

        {/* Attention Items */}
        {data.attentionItems.length > 0 && (
          <section className="mt-6">
            <h2 className="text-base font-semibold text-gray-700">Items Needing Attention</h2>
            <ul className="mt-2 space-y-2">
              {data.attentionItems.map((item, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                  {item.message}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2">

          {/* Due Assignments */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800">Due Assignments</h2>
            {data.dueAssignments.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">No upcoming assignments.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {data.dueAssignments.map((a) => {
                  const isOverdue = a.deadline < now;
                  return (
                    <li key={a.id} className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{a.title}</p>
                          <p className="text-xs text-gray-500">{a.moduleName}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            isOverdue
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {isOverdue ? "Overdue" : a.deadline.toLocaleDateString("en-MV", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400 capitalize">
                        {a.submissionStatus.replace("_", " ").toLowerCase()}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Attendance */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800">Attendance</h2>
            {data.attendanceByModuleOffering.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">No attendance recorded yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {data.attendanceByModuleOffering.map((att) => (
                  <li key={att.moduleOfferingId} className="flex items-center justify-between py-3">
                    <span className="text-sm text-gray-700">{att.moduleName}</span>
                    <span
                      className={`text-sm font-semibold ${
                        att.percentage === null
                          ? "text-gray-400"
                          : att.percentage < 80
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {att.percentage === null ? "—" : `${att.percentage}%`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Released Marks */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800">Released Marks</h2>
            {data.releasedMarks.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">No marks released yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {data.releasedMarks.map((m) => (
                  <li key={m.id} className="flex items-start justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{m.assessmentComponentTitle}</p>
                      <p className="text-xs text-gray-500">{m.moduleName}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      {m.score} / {m.maximumMark}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {data.releasedFinalGrades.length > 0 && (
              <>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Final Grades</h3>
                <ul className="mt-1 divide-y divide-gray-100">
                  {data.releasedFinalGrades.map((fg) => (
                    <li key={fg.moduleOfferingId} className="flex items-center justify-between py-3">
                      <span className="text-sm text-gray-700">{fg.moduleName}</span>
                      <span
                        className={`text-sm font-semibold ${fg.isPassing ? "text-green-600" : "text-red-600"}`}
                      >
                        {fg.percentage}% {fg.isPassing ? "Pass" : "Not yet passed"}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* Course Progress */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800">Course Progress</h2>
            {data.courseProgress.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">No progress recorded yet.</p>
            ) : (
              <ul className="mt-3 space-y-4">
                {data.courseProgress.map((cp) => {
                  const pct = cp.totalModules > 0 ? Math.round((cp.completedModules / cp.totalModules) * 100) : 0;
                  return (
                    <li key={cp.academicLevelId}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{cp.academicLevelLabel}</span>
                        <span className="text-gray-500">{cp.completedModules} / {cp.totalModules}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

        </div>

        {/* Chat Activity */}
        {data.chatActivity.some((c) => c.hasUnread) && (
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800">Unread Chat Activity</h2>
            <ul className="mt-3 divide-y divide-gray-100">
              {data.chatActivity
                .filter((c) => c.hasUnread)
                .map((c) => (
                  <li key={c.chatId} className="py-3 text-sm text-gray-700">
                    {c.moduleName} — new messages
                  </li>
                ))}
            </ul>
          </section>
        )}

        {/* Upcoming Calendar Events */}
        {data.upcomingCalendarEvents.length > 0 && (
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Upcoming Events</h2>
              <Link href="/student/academic-calendar" className="text-xs text-blue-600 hover:underline">
                View calendar
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-gray-100">
              {data.upcomingCalendarEvents.slice(0, 5).map((e) => (
                <li key={e.id} className="flex items-start justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{e.title}</p>
                    <p className="text-xs text-gray-500 capitalize">{e.kind.replace(/_/g, " ").toLowerCase()}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {e.startAt.toLocaleDateString("en-MV", { day: "numeric", month: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
