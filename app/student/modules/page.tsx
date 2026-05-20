import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty";

export default async function StudentModulesPage() {
  const { account } = await requireAuthPage({ roles: ["STUDENT"] });

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: account.id, status: "ACTIVE" },
    include: {
      courseOffering: {
        include: {
          moduleOfferings: {
            include: { templateModule: { include: { module: true } } },
          },
        },
      },
    },
  });

  const MODULE_TONES = [
    { bg: "var(--lav)", fg: "var(--lav-ink)" },
    { bg: "var(--peach)", fg: "var(--peach-ink)" },
    { bg: "var(--sky)", fg: "var(--sky-ink)" },
    { bg: "var(--rose)", fg: "var(--rose-ink)" },
    { bg: "var(--lemon)", fg: "var(--lemon-ink)" },
    { bg: "var(--primary-soft)", fg: "var(--primary-deep)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1
          className="text-[22px] font-extrabold tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
        >
          My Modules
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
          All modules from your active course enrollments
        </p>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          title="No modules yet"
          body="You're not enrolled in any active course offerings. Contact your administrator."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {enrollments.map((e) => (
            <section key={e.id}>
              <div
                className="text-[11px] uppercase tracking-[0.1em] font-bold mb-3"
                style={{ color: "var(--ink-4)" }}
              >
                {e.courseOffering.name}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 12,
                }}
              >
                {e.courseOffering.moduleOfferings.map((mo, i) => {
                  const tone = MODULE_TONES[i % MODULE_TONES.length];
                  return (
                    <Link
                      key={mo.id}
                      href={`/student/modules/${mo.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "16px 18px",
                        borderRadius: 16,
                        border: "1px solid var(--line)",
                        background: "var(--surface)",
                        textDecoration: "none",
                        transition: "border-color 0.15s, box-shadow 0.15s",
                      }}
                      className="module-card-link"
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          display: "grid",
                          placeItems: "center",
                          background: tone.bg,
                          color: tone.fg,
                          flexShrink: 0,
                        }}
                      >
                        <BookOpen size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="font-semibold text-[14px] leading-tight"
                          style={{ color: "var(--ink)" }}
                        >
                          {mo.templateModule.module.name}
                        </div>
                      </div>
                      <ArrowRight size={15} style={{ color: "var(--ink-4)", flexShrink: 0 }} />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
