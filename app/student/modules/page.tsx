import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function StudentModulesPage() {
  const { account } = await requireAuthPage({ roles: ["STUDENT"] });

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: account.id, status: "ACTIVE" },
    include: {
      courseOffering: {
        include: {
          moduleOfferings: {
            include: { templateModule: { include: { module: true } } },
          },
        },
      },
    },
  });

  return (
    <main className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">My Modules</h1>
        <Link href="/student/dashboard" className="text-sm text-blue-600 underline">Dashboard</Link>
      </div>

      {enrollments.length === 0 ? (
        <p className="text-sm text-gray-500">Not enrolled in any course offerings.</p>
      ) : (
        <div className="space-y-6">
          {enrollments.map((e) => (
            <section key={e.id}>
              <h2 className="text-sm font-semibold text-gray-500 mb-2">{e.courseOffering.name}</h2>
              <ul className="space-y-2">
                {e.courseOffering.moduleOfferings.map((mo) => (
                  <li key={mo.id}>
                    <Link
                      href={`/student/modules/${mo.id}`}
                      className="block rounded border border-gray-200 bg-white px-5 py-3 hover:border-blue-300 hover:shadow-sm transition"
                    >
                      <p className="font-medium text-gray-900">{mo.templateModule.module.name}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
