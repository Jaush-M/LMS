import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { CreateAssignmentForm } from "./create-assignment-form";

export default async function EducatorAssignmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { id: true, role: true, mustChangePassword: true },
  });
  if (!actor || actor.role !== "EDUCATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const mo = await prisma.moduleOffering.findUnique({
    where: { id, primaryEducatorId: actor.id },
    include: { templateModule: { include: { module: true } } },
  });
  if (!mo) notFound();

  const assignments = await prisma.assignment.findMany({
    where: { moduleOfferingId: id },
    orderBy: { deadline: "asc" },
    include: { _count: { select: { submissions: true } } },
  });

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Assignments — {mo.templateModule.module.name}</h1>
        <Link href={`/educator/modules/${id}`} className="text-sm text-blue-600 underline">Back to module</Link>
      </div>

      <CreateAssignmentForm moduleOfferingId={id} />

      {assignments.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No assignments yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {assignments.map((a) => (
            <li key={a.id}>
              <Link
                href={`/educator/modules/${id}/assignments/${a.id}`}
                className="flex items-center justify-between rounded border border-gray-200 bg-white px-5 py-4 hover:border-blue-300 hover:shadow-sm transition"
              >
                <div>
                  <p className="font-medium text-gray-800">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Due {a.deadline.toLocaleDateString()} · {a._count.submissions} submission{a._count.submissions !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${a.status === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {a.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
