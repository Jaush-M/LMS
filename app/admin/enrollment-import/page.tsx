import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
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
    <main className="p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Enrollment Import</h1>
        <Link href="/admin/dashboard" className="text-sm text-blue-600 underline">
          Dashboard
        </Link>
      </div>
      <div className="mt-6">
        <EnrollmentImportForm
          courseOfferings={courseOfferings.map((courseOffering) => ({
            id: courseOffering.id,
            label: `${courseOffering.name} - ${courseOffering.course.code} ${courseOffering.course.name} - ${courseOffering.intake.name}`,
          }))}
        />
      </div>
    </main>
  );
}
