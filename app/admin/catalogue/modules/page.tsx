import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { ModuleRow } from "./module-row";
import { CreateModuleForm } from "./create-module-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/empty";

export default async function ModulesPage() {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const modules = await prisma.module.findMany({ orderBy: { name: "asc" } });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href="/admin/catalogue" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        Catalogue
      </Link>

      <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>Modules</h1>

      <CreateModuleForm />

      {modules.length === 0 ? (
        <EmptyState title="No modules" body="Add your first module using the form above." />
      ) : (
        <div style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
                <th style={{ padding: "10px 18px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Code</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Name</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Status</th>
                <th style={{ padding: "10px 18px 10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <ModuleRow key={m.id} module={m} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
