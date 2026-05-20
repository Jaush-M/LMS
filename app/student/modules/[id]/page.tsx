import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function StudentModuleHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { account } = await requireAuthPage({ roles: ["STUDENT"] });

  const mo = await prisma.moduleOffering.findUnique({
    where: { id },
    include: {
      templateModule: { include: { module: true } },
      courseOffering: { include: { course: true } },
    },
  });
  if (!mo) notFound();

  // verify enrollment
  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: account.id, courseOfferingId: mo.courseOfferingId, status: "ACTIVE" },
  });
  if (!enrollment) notFound();

  const links = [
    { href: `/student/modules/${id}/content`, label: "Content" },
    { href: `/student/modules/${id}/assignments`, label: "Assignments" },
    { href: `/student/modules/${id}/chat`, label: "Group Chat" },
    { href: `/student/modules/${id}/feedback`, label: "Module Feedback" },
  ];

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{mo.templateModule.module.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{mo.courseOffering.name}</p>
        </div>
        <Link href="/student/modules" className="text-sm text-blue-600 underline">All modules</Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between rounded border border-gray-200 bg-white px-5 py-4 hover:border-blue-300 hover:shadow-sm transition"
          >
            <span className="font-medium text-gray-800">{label}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
