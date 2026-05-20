import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCalendarFeed } from "@/lib/academic-calendar";
import { CreateModuleOfferingEventForm } from "./create-module-offering-event-form";

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

export default async function EducatorAcademicCalendarPage() {
  const { account } = await requireAuthPage({ roles: ["EDUCATOR"] });

  const moduleOfferings = await prisma.moduleOffering.findMany({
    where: { primaryEducatorId: account.id, courseOffering: { status: { not: "ARCHIVED" } } },
    select: { id: true, templateModule: { select: { module: { select: { name: true } } } }, courseOffering: { select: { name: true } } },
    orderBy: { courseOffering: { name: "asc" } },
  });

  const feed = await getCalendarFeed(account.id);

  const moduleOfferingOptions = moduleOfferings.map((mo) => ({
    id: mo.id,
    label: `${mo.courseOffering.name} — ${mo.templateModule.module.name}`,
  }));

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/educator/dashboard" className="text-sm text-gray-500 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold">Academic Calendar</h1>
      </div>

      {moduleOfferingOptions.length > 0 && (
        <CreateModuleOfferingEventForm moduleOfferings={moduleOfferingOptions} />
      )}

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
