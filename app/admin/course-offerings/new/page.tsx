import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CreateCourseOfferingForm } from "./create-form";

export default async function NewCourseOfferingPage() {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const [courses, educators, intakes, studyModes] = await Promise.all([
    prisma.course.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        code: true,
        name: true,
        curriculumTemplate: {
          select: {
            id: true,
            templateModules: {
              select: {
                id: true,
                sortOrder: true,
                module: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.userAccount.findMany({
      where: { role: "EDUCATOR", status: "ACTIVE" },
      include: { user: { select: { name: true } } },
      orderBy: { generatedIdentifier: "asc" },
    }),
    prisma.intake.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.studyMode.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href="/admin/course-offerings" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        Course Offerings
      </Link>

      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          Create Course Offering
        </h1>
      </div>

      <CreateCourseOfferingForm
        courses={courses}
        educators={educators.map((e) => ({
          id: e.id,
          generatedIdentifier: e.generatedIdentifier,
          name: e.user.name,
        }))}
        intakes={intakes}
        studyModes={studyModes}
      />
    </div>
  );
}
