import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, ClipboardList, BarChart2, Calendar, MessageSquare, Star,
  ArrowRight, ChevronLeft,
} from "lucide-react";
import { Chip } from "@/components/ui/chip";

const MODULE_LINKS = [
  { key: "content",     label: "Content",             sub: "Learning materials & resources",   icon: BookOpen,       tone: { bg: "var(--primary-soft)", fg: "var(--primary-deep)" } },
  { key: "assignments", label: "Assignments",          sub: "Create, mark & manage tasks",       icon: ClipboardList,  tone: { bg: "var(--peach)", fg: "var(--peach-ink)" } },
  { key: "grades",      label: "Grades & Assessment",  sub: "Assessment schema & final grades",  icon: BarChart2,      tone: { bg: "var(--lav)", fg: "var(--lav-ink)" } },
  { key: "sessions",    label: "Class Sessions",        sub: "Schedule & attendance records",     icon: Calendar,       tone: { bg: "var(--sky)", fg: "var(--sky-ink)" } },
  { key: "chat",        label: "Group Chat",            sub: "Communicate with students",        icon: MessageSquare,  tone: { bg: "var(--lemon)", fg: "var(--lemon-ink)" } },
  { key: "feedback",    label: "Feedback",              sub: "Anonymous student feedback",       icon: Star,           tone: { bg: "var(--rose)", fg: "var(--rose-ink)" } },
];

export default async function EducatorModuleHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { account } = await requireAuthPage({ roles: ["EDUCATOR"] });

  const mo = await prisma.moduleOffering.findUnique({
    where: { id, primaryEducatorId: account.id },
    include: {
      templateModule: { include: { module: true } },
      courseOffering: { include: { course: true, intake: true } },
      _count: {
        select: {
          contentSections: true,
          assignments: true,
          classSessions: true,
          assessmentComponents: true,
        },
      },
    },
  });
  if (!mo) notFound();

  const countFor = (key: string): number | null => {
    if (key === "content") return mo._count.contentSections;
    if (key === "assignments") return mo._count.assignments;
    if (key === "grades") return mo._count.assessmentComponents;
    if (key === "sessions") return mo._count.classSessions;
    return null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Back nav */}
      <Link href="/educator/modules" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        All modules
      </Link>

      {/* Module header */}
      <div
        style={{
          padding: "24px 28px",
          borderRadius: 20,
          border: "1px solid oklch(0.85 0.08 160)",
          background: "linear-gradient(120deg, oklch(0.92 0.06 162) 0%, oklch(0.94 0.05 175) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className="text-[11px] uppercase tracking-[0.1em] font-bold mb-1" style={{ color: "oklch(0.42 0.08 162)" }}>
              {mo.courseOffering.name}
            </div>
            <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "oklch(0.18 0.04 160)" }}>
              {mo.templateModule.module.name}
            </h1>
          </div>
          <Chip variant={mo.status === "ACTIVE" ? "ok" : "default"}>{mo.status}</Chip>
        </div>
      </div>

      {/* Navigation grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {MODULE_LINKS.map(({ key, label, sub, icon: Icon, tone }) => {
          const count = countFor(key);
          return (
            <Link
              key={key}
              href={`/educator/modules/${id}/${key}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "18px 20px",
                borderRadius: 16,
                border: "1px solid var(--line)",
                background: "var(--surface)",
                textDecoration: "none",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              className="module-card-link"
            >
              <div style={{ width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", background: tone.bg, color: tone.fg, flexShrink: 0 }}>
                <Icon size={21} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="font-bold text-[14px]" style={{ color: "var(--ink)" }}>{label}</div>
                <div className="text-[12px] mt-0.5" style={{ color: "var(--ink-3)" }}>{sub}</div>
              </div>
              {count !== null && (
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)", flexShrink: 0 }}>{count}</span>
              )}
              <ArrowRight size={15} style={{ color: "var(--ink-4)", flexShrink: 0 }} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
