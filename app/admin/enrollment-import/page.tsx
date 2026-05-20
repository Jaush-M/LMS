import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { EnrollmentImportForm } from "./form";

export default async function EnrollmentImportPage() {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const courseOfferings = await prisma.courseOffering.findMany({
    select: {
      id: true,
      name: true,
      course: { select: { code: true, name: true } },
      intake: { select: { name: true } },
    },
    orderBy: { startAt: "desc" },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1
          className="text-[22px] font-extrabold tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
        >
          Enrollment Import
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
          Upload a CSV to enroll students into a course offering
        </p>
      </div>

      <EnrollmentImportForm
        courseOfferings={courseOfferings.map((courseOffering) => ({
          id: courseOffering.id,
          label: `${courseOffering.name} — ${courseOffering.course.code} ${courseOffering.course.name} — ${courseOffering.intake.name}`,
        }))}
      />
    </div>
  );
}
