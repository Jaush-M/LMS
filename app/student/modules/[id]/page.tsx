import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, ClipboardList, MessageSquare, Star, ArrowRight, ChevronLeft,
} from "lucide-react";

const MODULE_LINKS = [
  { key: "content",     label: "Content",         sub: "Learning materials & resources",  icon: BookOpen,       tone: { bg: "var(--primary-soft)", fg: "var(--primary-deep)" } },
  { key: "assignments", label: "Assignments",      sub: "Tasks, submissions & marks",      icon: ClipboardList,  tone: { bg: "var(--peach)", fg: "var(--peach-ink)" } },
  { key: "chat",        label: "Group Chat",       sub: "Discuss with peers & educator",   icon: MessageSquare,  tone: { bg: "var(--lav)", fg: "var(--lav-ink)" } },
  { key: "feedback",    label: "Module Feedback",  sub: "Share your feedback anonymously", icon: Star,           tone: { bg: "var(--lemon)", fg: "var(--lemon-ink)" } },
];

export default async function StudentModuleHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { account } = await requireAuthPage({ roles: ["STUDENT"] });

  const mo = await prisma.moduleOffering.findUnique({
    where: { id },
    include: {
      templateModule: { include: { module: true } },
      courseOffering: { include: { course: true } },
    },
  });
  if (!mo) notFound();

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: account.id, courseOfferingId: mo.courseOfferingId, status: "ACTIVE" },
  });
  if (!enrollment) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Back nav */}
      <Link
        href="/student/modules"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 13,
          fontWeight: 600,
          color: "var(--ink-3)",
          textDecoration: "none",
          width: "fit-content",
        }}
        className="module-back-link"
      >
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
        <div
          className="text-[11px] uppercase tracking-[0.1em] font-bold mb-1"
          style={{ color: "oklch(0.42 0.08 162)" }}
        >
          {mo.courseOffering.name}
        </div>
        <h1
          className="text-[22px] font-extrabold tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-display)", color: "oklch(0.18 0.04 160)" }}
        >
          {mo.templateModule.module.name}
        </h1>
      </div>

      {/* Navigation grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {MODULE_LINKS.map(({ key, label, sub, icon: Icon, tone }) => (
          <Link
            key={key}
            href={`/student/modules/${id}/${key}`}
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
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background: tone.bg,
                color: tone.fg,
                flexShrink: 0,
              }}
            >
              <Icon size={21} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="font-bold text-[14px]"
                style={{ color: "var(--ink)" }}
              >
                {label}
              </div>
              <div className="text-[12px] mt-0.5" style={{ color: "var(--ink-3)" }}>
                {sub}
              </div>
            </div>
            <ArrowRight size={15} style={{ color: "var(--ink-4)", flexShrink: 0 }} />
          </Link>
        ))}
      </div>
    </div>
  );
}
