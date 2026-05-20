import { requireAuthPage } from "@/lib/auth-guard";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default async function CataloguePage() {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const sections = [
    { href: "/admin/catalogue/faculties", label: "Faculties", description: "Manage academic faculties" },
    { href: "/admin/catalogue/courses", label: "Courses", description: "Courses and award levels" },
    { href: "/admin/catalogue/modules", label: "Modules", description: "Individual teaching modules" },
    { href: "/admin/catalogue/intakes", label: "Intakes", description: "Student intake cohorts" },
    { href: "/admin/catalogue/study-modes", label: "Study Modes", description: "Full-time, part-time, etc." },
    { href: "/admin/catalogue/session-types", label: "Session Types", description: "Lecture, tutorial, lab, etc." },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          Academic Catalogue
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>Manage reference data used across the LMS.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "14px 18px",
              borderRadius: 14,
              border: "1px solid var(--line)",
              background: "var(--surface)",
              textDecoration: "none",
              transition: "border-color 0.15s",
            }}
            className="module-card-link"
          >
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{s.label}</p>
              <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{s.description}</p>
            </div>
            <ArrowRight size={14} style={{ color: "var(--ink-4)", flexShrink: 0 }} />
          </Link>
        ))}
      </div>
    </div>
  );
}
