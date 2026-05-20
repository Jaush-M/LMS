import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EditSessionTypeForm } from "./edit-session-type-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditSessionTypePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const { id } = await params;
  const type = await prisma.sessionType.findUnique({ where: { id } });
  if (!type) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href="/admin/catalogue/session-types" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        Session Types
      </Link>
      <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>Edit Session Type</h1>
      <div style={{ maxWidth: 400 }}>
        <EditSessionTypeForm id={type.id} defaultName={type.name} />
      </div>
    </div>
  );
}
