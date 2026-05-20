import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href={`/admin/course-offerings/${id}/sessions`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        Sessions
      </Link>

      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          Schedule Session
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>{offering.name}</p>
      </div>

      <div style={{ maxWidth: 480 }}>
        <CreateSessionForm
          courseOfferingId={id}
          moduleOfferings={offering.moduleOfferings.map((mo) => ({ id: mo.id, name: mo.templateModule.module.name }))}
          sessionTypes={sessionTypes.map((t) => ({ id: t.id, name: t.name }))}
        />
      </div>
    </div>
  );
}
