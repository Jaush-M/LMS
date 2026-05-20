import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCalendarFeed } from "@/lib/academic-calendar";
import { CreateInstitutionEventForm } from "./create-institution-event-form";
import { CreateCourseOfferingEventForm } from "./create-course-offering-event-form";

const MALDIVES_OFFSET_MS = 5 * 60 * 60 * 1000;

function toMaldivesTime(date: Date): string {
  const shifted = new Date(date.getTime() + MALDIVES_OFFSET_MS);
  return shifted.toISOString().replace("T", " ").slice(0, 16) + " MVT";
}

const KIND_LABEL: Record<string, string> = {
  INSTITUTION_EVENT: "Institution Event",
  COURSE_OFFERING_EVENT: "Course Offering Event",
  MODULE_OFFERING_EVENT: "Module Offering Event",
  CLASS_SESSION: "Class Session",
  ASSIGNMENT_DEADLINE: "Assignment Deadline",
};

export default async function AdministratorAcademicCalendarPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { id: true, role: true, mustChangePassword: true },
  });
  if (!actor || actor.role !== "ADMINISTRATOR" && actor.role !== "SUPER_ADMINISTRATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const [feed, courseOfferings] = await Promise.all([
    getCalendarFeed(actor.id),
    prisma.courseOffering.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold">Academic Calendar</h1>
      </div>

      <CreateInstitutionEventForm />
      <CreateCourseOfferingEventForm courseOfferings={courseOfferings} />

      <section>
        <h2 className="text-lg font-medium mb-3">Upcoming</h2>
        {feed.length === 0 ? (
          <p className="text-sm text-gray-500">No events.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-medium">Start (MVT)</th>
                <th className="py-2 pr-4 font-medium">Title</th>
                <th className="py-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {feed.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2 pr-4 tabular-nums">{toMaldivesTime(item.startAt)}</td>
                  <td className="py-2 pr-4">{item.title}</td>
                  <td className="py-2 text-gray-500">{KIND_LABEL[item.kind] ?? item.kind}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
