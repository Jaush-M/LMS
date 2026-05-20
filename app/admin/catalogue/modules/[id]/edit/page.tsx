import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EditModuleForm } from "./edit-module-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditModulePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const { id } = await params;
  const mod = await prisma.module.findUnique({ where: { id } });
  if (!mod) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href="/admin/catalogue/modules" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        Modules
      </Link>
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>Edit Module</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>Code: <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{mod.code}</span></p>
      </div>
      <div style={{ maxWidth: 520 }}>
        <EditModuleForm id={mod.id} defaultName={mod.name} defaultDescription={mod.description} />
      </div>
    </div>
  );
}
