import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CreateSessionForm } from "./create-session-form";

export default async function NewSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const offering = await prisma.courseOffering.findUnique({
    where: { id },
    include: {
      moduleOfferings: { include: { templateModule: { include: { module: true } } } },
    },
  });
  if (!offering) notFound();

  const sessionTypes = await prisma.sessionType.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } });

  return (
    <main className="p-8 max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Schedule Session</h1>
        <Link href={`/admin/course-offerings/${id}/sessions`} className="text-sm text-blue-600 underline">Back</Link>
      </div>

      <CreateSessionForm
        courseOfferingId={id}
        moduleOfferings={offering.moduleOfferings.map((mo) => ({ id: mo.id, name: mo.templateModule.module.name }))}
        sessionTypes={sessionTypes.map((t) => ({ id: t.id, name: t.name }))}
      />
    </main>
  );
}
