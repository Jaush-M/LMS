import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Users, ArrowRight } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty";

export default async function CourseOfferingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const offering = await prisma.courseOffering.findUnique({
    where: { id },
    include: {
      course: true,
      intake: true,
      studyMode: true,
      moduleOfferings: {
        include: {
          templateModule: { include: { module: true } },
          primaryEducator: { include: { user: { select: { name: true } } } },
        },
        orderBy: { templateModule: { sortOrder: "asc" } },
      },
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          student: { include: { user: { select: { name: true } } } },
          capacityOverride: { select: { reason: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!offering) notFound();

  const enrolledCount = offering.enrollments.length;
  const fillPct = Math.round((enrolledCount / offering.capacity) * 100);
  const atCapacity = enrolledCount >= offering.capacity;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Link href="/admin/course-offerings" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        Course Offerings
      </Link>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
            {offering.name}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
            {offering.course.code} — {offering.course.name}
          </p>
        </div>
        <Chip variant={offering.status === "ARCHIVED" ? "default" : "ok"} size="sm">{offering.status}</Chip>
      </div>

      {/* Info grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "Intake", value: offering.intake.name },
          { label: "Study Mode", value: offering.studyMode.name },
          { label: "Dates", value: `${offering.startAt.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })} – ${offering.finishAt.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}` },
        ].map(({ label, value }) => (
          <div key={label} style={{ borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", padding: "14px 16px" }}>
            <p style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 500, marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Capacity */}
      <div style={{ borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>Enrollment Capacity</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{enrolledCount} / {offering.capacity}</span>
            {atCapacity && <Chip variant="warn" size="sm">Full</Chip>}
          </div>
        </div>
        <ProgressBar value={fillPct} />
      </div>

      {/* Module Offerings */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Module Offerings</h2>
          <Link href={`/admin/course-offerings/${id}/sessions`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: "var(--primary-strong)", textDecoration: "none" }}>
            View Sessions <ArrowRight size={12} />
          </Link>
        </div>
        {offering.moduleOfferings.length === 0 ? (
          <EmptyState title="No module offerings" body="No modules have been set up for this offering." />
        ) : (
          <div style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
                  <th style={{ padding: "10px 18px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Module</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Code</th>
                  <th style={{ padding: "10px 18px 10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Primary Educator</th>
                </tr>
              </thead>
              <tbody>
                {offering.moduleOfferings.map((mo) => (
                  <tr key={mo.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                    <td style={{ padding: "10px 18px", fontWeight: 600, color: "var(--ink)" }}>{mo.templateModule.module.name}</td>
                    <td style={{ padding: "10px 8px", fontFamily: "monospace", fontSize: 12, color: "var(--ink-3)" }}>{mo.templateModule.module.code}</td>
                    <td style={{ padding: "10px 18px 10px 8px", color: "var(--ink-2)" }}>{mo.primaryEducator.user.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enrolled Students */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={15} style={{ color: "var(--ink-3)" }} />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Enrolled Students ({enrolledCount})</h2>
          </div>
          {offering.status !== "ARCHIVED" && (
            <Link
              href={`/admin/course-offerings/${id}/enroll`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 14px",
                borderRadius: 9,
                background: "var(--primary-strong)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Enroll Student
            </Link>
          )}
        </div>

        {offering.enrollments.length === 0 ? (
          <EmptyState title="No students enrolled" body="Use the Enroll Student button to add students." />
        ) : (
          <div style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
                  <th style={{ padding: "10px 18px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Name</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Identifier</th>
                  <th style={{ padding: "10px 18px 10px 8px", textAlign: "left", fontWeight: 600, color: "var(--ink-3)", fontSize: 12 }}>Override</th>
                </tr>
              </thead>
              <tbody>
                {offering.enrollments.map((e) => (
                  <tr key={e.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                    <td style={{ padding: "10px 18px", fontWeight: 600, color: "var(--ink)" }}>{e.student.user.name}</td>
                    <td style={{ padding: "10px 8px", fontFamily: "monospace", fontSize: 12, color: "var(--ink-3)" }}>{e.student.generatedIdentifier}</td>
                    <td style={{ padding: "10px 18px 10px 8px", fontSize: 12, color: "var(--ink-3)" }}>{e.capacityOverride ? e.capacityOverride.reason : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
