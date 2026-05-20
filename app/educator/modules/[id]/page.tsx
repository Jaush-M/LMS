import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

export default async function EducatorModuleHubPage({ params }: { params: Promise<{ id: string }> }) {
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
    include: {
      templateModule: { include: { module: true } },
      courseOffering: { include: { course: true, intake: true } },
      _count: {
        select: {
          contentSections: true,
          assignments: true,
          classSessions: true,
          assessmentComponents: true,
        },
      },
    },
  });
  if (!mo) notFound();

  const links = [
    { href: `/educator/modules/${id}/content`, label: "Content", count: mo._count.contentSections },
    { href: `/educator/modules/${id}/assignments`, label: "Assignments", count: mo._count.assignments },
    { href: `/educator/modules/${id}/grades`, label: "Grades & Assessment", count: mo._count.assessmentComponents },
    { href: `/educator/modules/${id}/sessions`, label: "Class Sessions", count: mo._count.classSessions },
    { href: `/educator/modules/${id}/chat`, label: "Group Chat", count: null },
    { href: `/educator/modules/${id}/feedback`, label: "Feedback", count: null },
  ];

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{mo.templateModule.module.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{mo.courseOffering.name}</p>
        </div>
        <Link href="/educator/modules" className="text-sm text-blue-600 underline">All modules</Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {links.map(({ href, label, count }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between rounded border border-gray-200 bg-white px-5 py-4 hover:border-blue-300 hover:shadow-sm transition"
          >
            <span className="font-medium text-gray-800">{label}</span>
            {count !== null && (
              <span className="text-sm text-gray-400">{count}</span>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
