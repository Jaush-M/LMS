import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getCalendarFeed } from "@/lib/academic-calendar";
import { CreateModuleOfferingEventForm } from "./create-module-offering-event-form";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty";

const MALDIVES_OFFSET_MS = 5 * 60 * 60 * 1000;

function toMaldivesTime(date: Date): string {
  const shifted = new Date(date.getTime() + MALDIVES_OFFSET_MS);
  return shifted.toISOString().replace("T", " ").slice(0, 16) + " MVT";
}

const KIND_LABEL: Record<string, string> = {
  INSTITUTION_EVENT: "Institution",
  COURSE_OFFERING_EVENT: "Course",
  MODULE_OFFERING_EVENT: "Module",
  CLASS_SESSION: "Class session",
  ASSIGNMENT_DEADLINE: "Deadline",
};

const KIND_CHIP: Record<string, "lav" | "peach" | "sky" | "bad" | "default"> = {
  INSTITUTION_EVENT: "peach",
  COURSE_OFFERING_EVENT: "sky",
  MODULE_OFFERING_EVENT: "lav",
  CLASS_SESSION: "sky",
  ASSIGNMENT_DEADLINE: "bad",
};

export default async function EducatorAcademicCalendarPage() {
  const { account } = await requireAuthPage({ roles: ["EDUCATOR"] });

  const moduleOfferings = await prisma.moduleOffering.findMany({
    where: { primaryEducatorId: account.id, courseOffering: { status: { not: "ARCHIVED" } } },
    select: {
      id: true,
      templateModule: { select: { module: { select: { name: true } } } },
      courseOffering: { select: { name: true } },
    },
    orderBy: { courseOffering: { name: "asc" } },
  });

  const feed = await getCalendarFeed(account.id);

  const moduleOfferingOptions = moduleOfferings.map((mo) => ({
    id: mo.id,
    label: `${mo.courseOffering.name} — ${mo.templateModule.module.name}`,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1
          className="text-[22px] font-extrabold tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
        >
          Academic Calendar
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
          Your schedule, sessions, and upcoming deadlines
        </p>
      </div>

      {moduleOfferingOptions.length > 0 && (
        <Card>
          <CreateModuleOfferingEventForm moduleOfferings={moduleOfferingOptions} />
        </Card>
      )}

      {feed.length === 0 ? (
        <EmptyState title="No upcoming events" body="Your calendar is empty — check back later." />
      ) : (
        <Card flush>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {["Start (MVT)", "Event", "Type"].map((h) => (
                    <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontWeight: 700, fontSize: 11.5, color: "var(--ink-4)", letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {feed.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                    <td style={{ padding: "11px 20px", fontFamily: "monospace", fontSize: 12.5, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                      {toMaldivesTime(item.startAt)}
                    </td>
                    <td style={{ padding: "11px 20px", fontWeight: 500, color: "var(--ink)" }}>
                      {item.title}
                    </td>
                    <td style={{ padding: "11px 20px" }}>
                      <Chip variant={KIND_CHIP[item.kind] ?? "default"} size="sm">
                        {KIND_LABEL[item.kind] ?? item.kind}
                      </Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
