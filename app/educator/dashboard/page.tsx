import { requireAuthPage } from "@/lib/auth-guard";
import {
  FileCheck, Users, AlertTriangle, Clock, CheckCircle,
  ArrowRight, MessageSquare, Calendar,
} from "lucide-react";
import { getEducatorDashboard } from "@/lib/educator-dashboard";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { StatCard, StatIcon } from "@/components/ui/stat";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty";
import { Banner } from "@/components/ui/banner";
import type { AtRiskReason } from "@/lib/educator-dashboard";

const AVATAR_TONES = ["lav", "peach", "sky", "rose", "lemon", "sand", "mint", ""] as const;
type AvatarTone = (typeof AVATAR_TONES)[number];

function toneForName(name: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function reasonChipVariant(r: AtRiskReason): "warn" | "bad" {
  return r.kind === "LOW_ATTENDANCE" ? "warn" : "bad";
}

function reasonLabel(r: AtRiskReason): string {
  if (r.kind === "LOW_ATTENDANCE") return `Attendance ${r.attendancePercentage}%`;
  if (r.kind === "OVERDUE_ASSIGNMENT") return `Overdue: ${r.assignmentTitle}`;
  return `Final grade ${r.percentage}%`;
}

export default async function EducatorDashboardPage() {
  const { user, account } = await requireAuthPage({ roles: ["EDUCATOR"] });
  const data = await getEducatorDashboard(account.id);

  const now = new Date();
  const dayName = now.toLocaleDateString("en", { weekday: "long" });
  const dateStr = now.toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" });

  const overdueUnsubmitted = data.unsubmittedAttendanceSessions.filter(
    (s) => now.getTime() - s.startAt.getTime() > 7 * 24 * 60 * 60 * 1000,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Attendance warning banner */}
      {overdueUnsubmitted.length > 0 && (
        <Banner variant="warn" icon={<Clock size={16} />}>
          You have {overdueUnsubmitted.length} attendance record{overdueUnsubmitted.length > 1 ? "s" : ""} overdue for more than 7 days.
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
        {/* Pending marking */}
        <StatCard
          label="Pending marking"
          value={data.pendingMarking.length}
          icon={<StatIcon tone="peach"><FileCheck size={22} /></StatIcon>}
        />

        {/* Module offerings */}
        <StatCard
          label="Module offerings"
          value={data.assignedModuleOfferings.length}
          delta={`${data.assignedModuleOfferings.length} offering${data.assignedModuleOfferings.length !== 1 ? "s" : ""} assigned`}
          icon={<StatIcon tone="mint"><Users size={22} /></StatIcon>}
        />

        {/* Upcoming sessions */}
        <StatCard
          label="Upcoming sessions"
          value={data.upcomingClassSessions.length}
          delta={data.upcomingClassSessions[0]
            ? data.upcomingClassSessions[0].startAt.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" })
            : undefined}
          icon={<StatIcon tone="sky"><Calendar size={22} /></StatIcon>}
        />

        {/* At-risk students */}
        <StatCard
          label="Students at risk"
          value={data.atRiskStudents.length}
          delta="Based on transparent criteria"
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
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Marking queue */}
          <Card flush>
            <CardHeader padded>
              <CardTitle count={data.pendingMarking.length}>Marking queue</CardTitle>
            </CardHeader>
            {data.pendingMarking.length === 0 ? (
              <div style={{ padding: "0 20px 20px" }}>
                <EmptyState title="All caught up" body="No submissions awaiting marking." />
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
                      {["Assignment", "Module", "Student", "Submitted"].map((h) => (
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
                    {data.pendingMarking.map((item) => {
                      const isOld = now.getTime() - item.submittedAt.getTime() > 7 * 24 * 60 * 60 * 1000;
                      return (
                        <tr
                          key={item.submissionId}
                          style={{ borderBottom: "1px solid var(--line-2)" }}
                        >
                          <td style={{ padding: "12px 20px", fontWeight: 600, color: "var(--ink)" }}>
                            {item.assignmentTitle}
                          </td>
                          <td style={{ padding: "12px 20px", color: "var(--ink-3)", fontSize: 12.5 }}>
                            {item.moduleName}
                          </td>
                          <td style={{ padding: "12px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Avatar
                                initials={initials(item.studentName)}
                                tone={toneForName(item.studentName)}
                                size="sm"
                              />
                              <span style={{ fontWeight: 500, color: "var(--ink)" }}>{item.studentName}</span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 20px" }}>
                            <Chip variant={isOld ? "bad" : "default"} dot={isOld}>
                              {item.submittedAt.toLocaleDateString("en", { day: "numeric", month: "short" })}
                            </Chip>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* At-risk students */}
          <Card>
            <CardHeader>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <CardTitle count={data.atRiskStudents.length}>Students who may need support</CardTitle>
                <Chip variant="ghost">
                  Criteria: attendance &lt; 80%, overdue submissions, failing grade
                </Chip>
              </div>
            </CardHeader>
            {data.atRiskStudents.length === 0 ? (
              <EmptyState title="No at-risk students" body="All students are on track based on current data." />
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 12,
                }}
              >
                {data.atRiskStudents.map((s) => (
                  <div
                    key={`${s.studentId}:${s.moduleOfferingId}`}
                    style={{
                      padding: 14,
                      border: "1px solid var(--line)",
                      borderRadius: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar
                        initials={initials(s.studentName)}
                        tone={toneForName(s.studentName)}
                        size="lg"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>{s.studentName}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 1 }}>{s.moduleName}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {s.reasons.map((r, i) => (
                        <Chip key={i} variant={reasonChipVariant(r)} size="sm">
                          {reasonLabel(r)}
                        </Chip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Unsubmitted attendance */}
          {data.unsubmittedAttendanceSessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle count={data.unsubmittedAttendanceSessions.length}>Attendance not yet submitted</CardTitle>
              </CardHeader>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.unsubmittedAttendanceSessions.map((s) => {
                  const isOld = now.getTime() - s.startAt.getTime() > 7 * 24 * 60 * 60 * 1000;
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: "var(--surface-2)",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          display: "grid",
                          placeItems: "center",
                          background: isOld ? "var(--bad-soft)" : "var(--warn-soft)",
                          color: isOld ? "var(--bad)" : "var(--warn)",
                          flexShrink: 0,
                        }}
                      >
                        <Clock size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{s.moduleName}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 1 }}>
                          {s.startAt.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" })}
                        </div>
                      </div>
                      <Chip variant={isOld ? "bad" : "warn"}>Pending</Chip>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Today's sessions */}
          <Card tight>
            <CardHeader>
              <CardTitle count={data.upcomingClassSessions.slice(0, 5).length}>Upcoming sessions</CardTitle>
            </CardHeader>
            {data.upcomingClassSessions.length === 0 ? (
              <EmptyState title="No upcoming sessions" body="Nothing scheduled yet." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {data.upcomingClassSessions.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
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
                        background: "var(--primary-soft)",
                        color: "var(--primary-deep)",
                        flexShrink: 0,
                      }}
                    >
                      <Calendar size={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.moduleName}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 1 }}>
                        {s.sessionTypeName}
                        {s.sessionLocation ? ` · ${s.sessionLocation}` : ""}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--ink-3)",
                        fontWeight: 600,
                        flexShrink: 0,
                        textAlign: "right",
                      }}
                    >
                      {s.startAt.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Unread @mentions */}
          <Card tight>
            <CardHeader>
              <CardTitle count={data.unreadMentions.length}>Mentions</CardTitle>
            </CardHeader>
            {data.unreadMentions.length === 0 ? (
              <EmptyState title="No new mentions" body="You'll be notified when students @mention you." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.unreadMentions.slice(0, 5).map((m) => (
                  <div
                    key={m.notificationId}
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
                        background: "var(--lav)",
                        color: "var(--lav-ink)",
                        flexShrink: 0,
                      }}
                    >
                      <MessageSquare size={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.moduleName}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 1 }}>
                        {m.createdAt.toLocaleDateString("en", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                    <Chip variant="lav" size="sm">new</Chip>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* My module offerings */}
          <Card tight>
            <CardHeader>
              <CardTitle count={data.assignedModuleOfferings.length}>My modules</CardTitle>
            </CardHeader>
            {data.assignedModuleOfferings.length === 0 ? (
              <EmptyState title="No modules assigned" body="Contact your administrator." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {data.assignedModuleOfferings.map((mo) => (
                  <div
                    key={mo.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "var(--surface-2)",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{mo.moduleName}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 2 }}>{mo.courseOfferingName}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
