import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { CreateAssignmentForm } from "./create-assignment-form";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty";

export default async function EducatorAssignmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { account } = await requireAuthPage({ roles: ["EDUCATOR"] });

  const mo = await prisma.moduleOffering.findUnique({
    where: { id, primaryEducatorId: account.id },
    include: { templateModule: { include: { module: true } } },
  });
  if (!mo) notFound();

  const assignments = await prisma.assignment.findMany({
    where: { moduleOfferingId: id },
    orderBy: { deadline: "asc" },
    include: { _count: { select: { submissions: true } } },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href={`/educator/modules/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        {mo.templateModule.module.name}
      </Link>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
            Assignments
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>{mo.templateModule.module.name}</p>
        </div>
        <CreateAssignmentForm moduleOfferingId={id} />
      </div>

      {assignments.length === 0 ? (
        <EmptyState title="No assignments yet" body="Create your first assignment using the button above." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {assignments.map((a) => (
            <Link
              key={a.id}
              href={`/educator/modules/${id}/assignments/${a.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 18px",
                borderRadius: 14,
                border: "1px solid var(--line)",
                background: "var(--surface)",
                textDecoration: "none",
                transition: "border-color 0.15s",
              }}
              className="module-card-link"
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{a.title}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>
                  Due {a.deadline.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" })}
                  {" · "}
                  {a._count.submissions} submission{a._count.submissions !== 1 ? "s" : ""}
                </div>
              </div>
              <Chip variant={a.status === "PUBLISHED" ? "ok" : "default"} size="sm">{a.status}</Chip>
              <ArrowRight size={14} style={{ color: "var(--ink-4)", flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
