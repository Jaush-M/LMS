import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function EducatorModulesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { id: true, role: true, mustChangePassword: true },
  });
  if (!actor || actor.role !== "EDUCATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const moduleOfferings = await prisma.moduleOffering.findMany({
    where: { primaryEducatorId: actor.id },
    include: {
      templateModule: { include: { module: true } },
      courseOffering: { include: { course: true, intake: true } },
    },
    orderBy: { courseOffering: { startAt: "desc" } },
  });

  return (
    <main className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">My Module Offerings</h1>
        <Link href="/educator/dashboard" className="text-sm text-blue-600 underline">Dashboard</Link>
      </div>

      {moduleOfferings.length === 0 ? (
        <p className="text-sm text-gray-500">No module offerings assigned.</p>
      ) : (
        <ul className="space-y-3">
          {moduleOfferings.map((mo) => (
            <li key={mo.id}>
              <Link
                href={`/educator/modules/${mo.id}`}
                className="block rounded border border-gray-200 bg-white px-5 py-4 hover:border-blue-300 hover:shadow-sm transition"
              >
                <p className="font-medium text-gray-900">{mo.templateModule.module.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{mo.courseOffering.name}</p>
                <p className="text-xs text-gray-400 mt-1">{mo.courseOffering.course.code} · {mo.status}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
