import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function CourseOfferingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true, mustChangePassword: true },
  });
  if (!actor || actor.role !== "ADMINISTRATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const offerings = await prisma.courseOffering.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      capacity: true,
      startAt: true,
      finishAt: true,
      course: { select: { code: true, name: true } },
      intake: { select: { name: true } },
      studyMode: { select: { name: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { startAt: "desc" },
  });

  return (
    <main className="p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Course Offerings</h1>
        <div className="flex gap-3">
          <Link href="/administrator/course-offerings/new" className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Create Course Offering
          </Link>
          <Link href="/administrator/dashboard" className="text-sm text-blue-600 underline self-center">
            Dashboard
          </Link>
        </div>
      </div>

      {offerings.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">No course offerings yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Course</th>
                <th className="py-2 pr-4 font-medium">Intake</th>
                <th className="py-2 pr-4 font-medium">Study Mode</th>
                <th className="py-2 pr-4 font-medium">Enrolled / Capacity</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {offerings.map((o) => (
                <tr key={o.id} className="border-b">
                  <td className="py-2 pr-4">
                    <Link href={`/administrator/course-offerings/${o.id}`} className="text-blue-600 underline">
                      {o.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{o.course.code}</td>
                  <td className="py-2 pr-4">{o.intake.name}</td>
                  <td className="py-2 pr-4">{o.studyMode.name}</td>
                  <td className="py-2 pr-4">
                    {o._count.enrollments} / {o.capacity}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${o.status === "ARCHIVED" ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="py-2">
                    <Link href={`/administrator/course-offerings/${o.id}`} className="text-sm text-blue-600 underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
