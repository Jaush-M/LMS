import { requireAuthPage } from "@/lib/auth-guard";
import Link from "next/link";
import {
  GraduationCap, Users, Layers, AlertTriangle, ArrowRight, Calendar,
} from "lucide-react";
import { getAdministratorDashboard } from "@/lib/administrator-dashboard";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { StatCard, StatIcon } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty";
import { Banner } from "@/components/ui/banner";
import { ProgressBar } from "@/components/ui/progress-bar";

export default async function AdminDashboardPage() {
  const { user, account } = await requireAuthPage({ minRole: "ADMINISTRATOR" });
  const isSuperAdmin = account.role === "SUPER_ADMINISTRATOR";
  const data = await getAdministratorDashboard();

  const totalEnrolled = data.activeCourseOfferings.reduce((sum, co) => sum + co.enrolmentCount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Alerts */}
      {data.moduleOfferingsWithoutActiveEducator.length > 0 && (
        <Banner variant="warn" icon={<AlertTriangle size={16} />}>
          {data.moduleOfferingsWithoutActiveEducator.length} module offering{data.moduleOfferingsWithoutActiveEducator.length > 1 ? "s" : ""} without an active educator — action required.
        </Banner>
      )}

      {/* KPI row */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        <StatCard
          label="Active offerings"
          value={data.activeCourseOfferings.length}
          delta="Semester 2025/26"
          icon={<StatIcon tone="peach"><Layers size={22} /></StatIcon>}
        />

        <StatCard
          label="Total enrolled"
          value={totalEnrolled}
          delta="Active enrollments"
          icon={<StatIcon tone="mint"><GraduationCap size={22} /></StatIcon>}
        />

        <StatCard
          label="Attendance completion"
          value={data.attendanceCompletionPercent !== null ? `${data.attendanceCompletionPercent}%` : "—"}
          delta="Sessions with records submitted"
          icon={<StatIcon tone="sky"><Users size={22} /></StatIcon>}
        />

        <StatCard
          label="Needs attention"
          value={data.moduleOfferingsWithoutActiveEducator.length}
          delta="Module offerings flagged"
          icon={<StatIcon tone="rose"><AlertTriangle size={22} /></StatIcon>}
        />
      </section>

      {/* Main / side layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Left: course offerings table */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card flush>
            <CardHeader padded>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <CardTitle count={data.activeCourseOfferings.length}>Active Course Offerings</CardTitle>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link
                    href="/admin/course-offerings"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "6px 12px",
                      borderRadius: 9,
                      border: "1px solid var(--line)",
                      background: "var(--surface)",
                      color: "var(--ink-2)",
                      fontSize: 12.5,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Open setup <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </CardHeader>
            {data.activeCourseOfferings.length === 0 ? (
              <div style={{ padding: "0 20px 20px" }}>
                <EmptyState title="No active offerings" body="Create a course offering to get started." />
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--line)" }}>
                      {["Offering", "Course", "Enrolled", "Period"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 20px",
                            textAlign: "left",
                            fontWeight: 700,
                            fontSize: 11.5,
                            color: "var(--ink-4)",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.activeCourseOfferings.map((co) => (
                      <tr
                        key={co.id}
                        style={{ borderBottom: "1px solid var(--line-2)" }}
                      >
                        <td style={{ padding: "12px 20px", fontWeight: 600, color: "var(--ink)" }}>
                          {co.name}
                        </td>
                        <td style={{ padding: "12px 20px", color: "var(--ink-3)", fontSize: 12.5 }}>
                          {co.courseName}
                        </td>
                        <td style={{ padding: "12px 20px" }}>
                          <Chip variant="lav">{co.enrolmentCount} enrolled</Chip>
                        </td>
                        <td style={{ padding: "12px 20px", color: "var(--ink-3)", fontSize: 12, whiteSpace: "nowrap" }}>
                          {co.startAt.toLocaleDateString("en", { month: "short", year: "numeric" })}
                          {" – "}
                          {co.finishAt.toLocaleDateString("en", { month: "short", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Module offerings without active educator */}
          {data.moduleOfferingsWithoutActiveEducator.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle count={data.moduleOfferingsWithoutActiveEducator.length}>
                  Module offerings needing an active educator
                </CardTitle>
              </CardHeader>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.moduleOfferingsWithoutActiveEducator.map((mo) => (
                  <div
                    key={mo.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "var(--warn-soft)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{mo.moduleName}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{mo.courseOfferingName}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--warn)", fontWeight: 600, flexShrink: 0 }}>
                      {mo.primaryEducatorName}
                    </div>
                    <Chip variant="warn">Inactive educator</Chip>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right rail: upcoming events + quick links */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Upcoming events */}
          <Card tight>
            <CardHeader>
              <CardTitle count={data.upcomingEvents.length}>Upcoming events</CardTitle>
            </CardHeader>
            {data.upcomingEvents.length === 0 ? (
              <EmptyState title="No upcoming events" body="Create events in the academic calendar." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {data.upcomingEvents.slice(0, 8).map((e) => (
                  <div
                    key={e.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: "var(--surface-2)",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        display: "grid",
                        placeItems: "center",
                        background: e.kind === "INSTITUTION" ? "var(--primary-soft)" : "var(--lav)",
                        color: e.kind === "INSTITUTION" ? "var(--primary-deep)" : "var(--lav-ink)",
                        flexShrink: 0,
                      }}
                    >
                      <Calendar size={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.title}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 1 }}>
                        {e.kind === "INSTITUTION" ? "Institution-wide" : e.courseOfferingName}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, flexShrink: 0, textAlign: "right" }}>
                      {e.startAt.toLocaleDateString("en", { day: "numeric", month: "short" })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick links */}
          <Card tight>
            <CardHeader>
              <CardTitle>Quick links</CardTitle>
            </CardHeader>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { href: "/admin/accounts", label: "Manage accounts" },
                { href: "/admin/enrollment-import", label: "Enrollment import" },
                { href: "/admin/catalogue", label: "Academic catalogue" },
                { href: "/admin/academic-calendar", label: "Academic calendar" },
                ...(isSuperAdmin
                  ? [
                      { href: "/admin/create-administrator", label: "Create administrator" },
                      { href: "/admin/system-settings", label: "System settings" },
                    ]
                  : []),
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="quick-link"
                >
                  {link.label}
                  <ArrowRight size={13} style={{ color: "var(--ink-4)" }} />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
