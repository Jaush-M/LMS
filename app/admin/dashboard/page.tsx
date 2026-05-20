import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdministratorDashboard } from "@/lib/administrator-dashboard";

export default async function AdminDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const userAccount = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true, mustChangePassword: true },
  });

  if (!userAccount || (userAccount.role !== "ADMINISTRATOR" && userAccount.role !== "SUPER_ADMINISTRATOR")) {
    redirect("/dashboard");
  }

  if (userAccount.mustChangePassword) redirect("/change-password");

  const isSuperAdmin = userAccount.role === "SUPER_ADMINISTRATOR";
  const data = await getAdministratorDashboard();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isSuperAdmin ? "Super Administrator Dashboard" : "Administrator Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">Welcome, {session.user.name}</p>

        <nav className="mt-3 flex flex-wrap gap-4 text-sm text-blue-600">
          <Link href="/admin/create-account" className="underline">Create account</Link>
          <Link href="/admin/accounts" className="underline">Manage accounts</Link>
          <Link href="/admin/enrollment-import" className="underline">Enrollment import</Link>
          <Link href="/admin/catalogue" className="underline">Academic catalogue</Link>
          <Link href="/admin/academic-calendar" className="underline">Academic Calendar</Link>
          {isSuperAdmin && (
            <>
              <Link href="/admin/create-administrator" className="underline">Create administrator</Link>
              <Link href="/admin/system-settings" className="underline">System settings</Link>
            </>
          )}
        </nav>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">

          {/* Active Course Offerings */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800">
              Active Course Offerings
              {data.attendanceCompletionPercent !== null && (
                <span className="ml-2 text-xs font-normal text-gray-500">
                  Attendance completion: {data.attendanceCompletionPercent}%
                </span>
              )}
            </h2>
            {data.activeCourseOfferings.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">No active course offerings.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {data.activeCourseOfferings.map((co) => (
                  <li key={co.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{co.name}</p>
                      <p className="text-xs text-gray-500">{co.courseName}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {co.enrolmentCount} enrolled
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Upcoming Events */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800">Upcoming Events</h2>
            {data.upcomingEvents.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">No upcoming events.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {data.upcomingEvents.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-2 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{e.title}</p>
                      <p className="text-xs text-gray-500">
                        {e.kind === "INSTITUTION" ? "Institution-wide" : e.courseOfferingName}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-500">
                      {e.startAt.toLocaleDateString("en-MV", { day: "numeric", month: "short" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Module Offerings Without Active Educator */}
          {data.moduleOfferingsWithoutActiveEducator.length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:col-span-2">
              <h2 className="font-semibold text-amber-800">
                Module Offerings Needing an Active Educator
                <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  {data.moduleOfferingsWithoutActiveEducator.length}
                </span>
              </h2>
              <ul className="mt-3 divide-y divide-amber-100">
                {data.moduleOfferingsWithoutActiveEducator.map((mo) => (
                  <li key={mo.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-amber-900">{mo.moduleName}</p>
                        <p className="text-xs text-amber-700">{mo.courseOfferingName}</p>
                      </div>
                      <span className="shrink-0 text-xs text-amber-600">
                        {mo.primaryEducatorName}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

        </div>
      </div>
    </main>
  );
}
