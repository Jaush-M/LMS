import { requireAuthPage } from "@/lib/auth-guard";
import { listStudyModes } from "@/lib/catalogue";
import { StudyModeRow } from "./study-mode-row";
import { CreateStudyModeForm } from "./create-study-mode-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/empty";

export default async function StudyModesPage() {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const modes = await listStudyModes({ includeInactive: true });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href="/admin/catalogue" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        Catalogue
      </Link>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>Study Modes</h1>
        <CreateStudyModeForm />
      </div>

      {modes.length === 0 ? (
        <EmptyState title="No study modes" body="Add your first study mode using the form above." />
      ) : (
        <div style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
                <th style={{ padding: "10px 18px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Name</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Status</th>
                <th style={{ padding: "10px 18px 10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {modes.map((m) => <StudyModeRow key={m.id} mode={m} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
