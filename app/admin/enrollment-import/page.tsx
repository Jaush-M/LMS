import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EnrollmentImportForm } from "./form";

export default async function EnrollmentImportPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true, mustChangePassword: true },
  });

  if (!actor || actor.role !== "ADMINISTRATOR" && actor.role !== "SUPER_ADMINISTRATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

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
