import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty";
import { Chip } from "@/components/ui/chip";

const MODULE_TONES = [
  { bg: "var(--lav)", fg: "var(--lav-ink)" },
  { bg: "var(--peach)", fg: "var(--peach-ink)" },
  { bg: "var(--sky)", fg: "var(--sky-ink)" },
  { bg: "var(--rose)", fg: "var(--rose-ink)" },
  { bg: "var(--lemon)", fg: "var(--lemon-ink)" },
  { bg: "var(--primary-soft)", fg: "var(--primary-deep)" },
];

export default async function EducatorModulesPage() {
  const { account } = await requireAuthPage({ roles: ["EDUCATOR"] });

  const moduleOfferings = await prisma.moduleOffering.findMany({
    where: { primaryEducatorId: account.id },
    include: {
      templateModule: { include: { module: true } },
      courseOffering: { include: { course: true, intake: true } },
    },
    orderBy: { courseOffering: { startAt: "desc" } },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1
          className="text-[22px] font-extrabold tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
        >
          My Module Offerings
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
          All modules you are assigned as primary educator
        </p>
      </div>

      {moduleOfferings.length === 0 ? (
        <EmptyState
          title="No modules assigned"
          body="You haven't been assigned to any module offerings yet. Contact your administrator."
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 12,
          }}
        >
          {moduleOfferings.map((mo, i) => {
            const tone = MODULE_TONES[i % MODULE_TONES.length];
            return (
              <Link
                key={mo.id}
                href={`/educator/modules/${mo.id}`}
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
                  <div className="text-[12px] mt-1" style={{ color: "var(--ink-3)" }}>
                    {mo.courseOffering.name}
                  </div>
                </div>
                <Chip variant={mo.status === "ACTIVE" ? "ok" : "default"} size="sm">
                  {mo.status}
                </Chip>
                <ArrowRight size={15} style={{ color: "var(--ink-4)", flexShrink: 0 }} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
