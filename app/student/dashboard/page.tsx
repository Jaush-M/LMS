import { requireAuthPage } from "@/lib/auth-guard";
import Link from "next/link";
import {
  ArrowUp, AlertTriangle, Clock, CheckCircle, Star,
  BookOpen, Calendar, ChevronRight, Info,
} from "lucide-react";
import { getStudentDashboard } from "@/lib/student-dashboard";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { StatCard, StatIcon } from "@/components/ui/stat";
import { Donut } from "@/components/ui/donut";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty";
import { Banner } from "@/components/ui/banner";
import type { AttentionItem, DueAssignment, ModuleAttendance } from "@/lib/student-dashboard";

function attentionItemTone(kind: AttentionItem["kind"]): {
  bg: string; fg: string; chipVariant: "warn" | "info" | "ok" | "bad"; chipLabel: string;
} {
  switch (kind) {
    case "LOW_ATTENDANCE":
      return { bg: "var(--warn-soft)", fg: "var(--warn)", chipVariant: "warn", chipLabel: "Heads-up" };
    case "OVERDUE_ASSIGNMENT":
      return { bg: "var(--bad-soft)", fg: "var(--bad)", chipVariant: "bad", chipLabel: "Catch up" };
    case "UPCOMING_DEADLINE":
      return { bg: "var(--info-soft)", fg: "var(--info)", chipVariant: "info", chipLabel: "Due soon" };
    case "FAILED_FINAL_GRADE":
      return { bg: "var(--bad-soft)", fg: "var(--bad)", chipVariant: "bad", chipLabel: "Attention" };
  }
}

function AssignmentStatusChip({ a }: { a: DueAssignment }) {
  const now = new Date();
  if (a.submissionStatus === "MARKED")
    return <Chip variant="ok" dot>Marked</Chip>;
  if (a.submissionStatus === "SUBMITTED")
    return <Chip variant="lav" dot>Submitted</Chip>;
  if (a.submissionStatus === "LATE")
    return <Chip variant="bad" dot>Late</Chip>;
  if (a.deadline < now)
    return <Chip variant="bad" dot>Overdue</Chip>;
  return <Chip variant="info" dot>Not submitted</Chip>;
}

export default async function StudentDashboardPage() {
  const { user, account } = await requireAuthPage({ roles: ["STUDENT"] });
  const data = await getStudentDashboard(account.id);

  const now = new Date();
  const dayName = now.toLocaleDateString("en", { weekday: "long" });
  const dateStr = now.toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" });

  // Aggregate attendance average
  const attendanceWithData = data.attendanceByModuleOffering.filter(a => a.percentage !== null);
  const avgAttendance = attendanceWithData.length > 0
    ? Math.round(attendanceWithData.reduce((s, a) => s + (a.percentage ?? 0), 0) / attendanceWithData.length)
    : null;

  // Overall course progress
  const totalModules = data.courseProgress.reduce((s, c) => s + c.totalModules, 0);
  const completedModules = data.courseProgress.reduce((s, c) => s + c.completedModules, 0);
  const overallPct = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  const openAssignments = data.dueAssignments.filter(
    a => a.submissionStatus === "NOT_SUBMITTED" || a.submissionStatus === "LATE"
  );
  const overdueCount = data.dueAssignments.filter(
    a => a.deadline < now && a.submissionStatus === "NOT_SUBMITTED"
  ).length;

  const unreadChats = data.chatActivity.filter(c => c.hasUnread).length;

  return (
    <div className="flex flex-col gap-4">

      {/* Hero */}
      <section
        className="rounded-[20px] px-7 py-[26px] relative overflow-hidden border"
        style={{
          background: "linear-gradient(120deg, var(--hero-from, oklch(0.72 0.13 162)) 0%, var(--hero-to, oklch(0.78 0.11 175)) 100%)",
          borderColor: "oklch(0.85 0.08 160)",
          color: "oklch(0.18 0.04 160)",
        }}
      >
        <div className="relative z-10">
          <div
            className="text-[11px] uppercase tracking-[0.1em] font-bold mb-1.5"
            style={{ color: "oklch(0.32 0.05 160)" }}
          >
            {dayName}, {dateStr}
          </div>
          <h2
            className="text-[22px] font-extrabold tracking-[-0.03em] mb-1.5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Welcome back, {user.name.split(" ")[0]} 👋
          </h2>
          <p className="text-[13.5px] leading-relaxed max-w-[440px]" style={{ color: "oklch(0.28 0.05 160)" }}>
            {data.attentionItems.length > 0
              ? `You have ${data.attentionItems.length} item${data.attentionItems.length > 1 ? "s" : ""} needing attention today.`
              : "Everything looks good — keep up the great work!"}
          </p>
          <div className="flex gap-2 mt-3.5 flex-wrap">
            <Link
              href="/student/modules"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[11px] text-[13px] font-semibold transition-opacity hover:opacity-80"
              style={{ background: "white", color: "var(--primary-deep)", borderColor: "transparent" }}
            >
              <BookOpen size={14} /> My modules
            </Link>
            <Link
              href="/student/academic-calendar"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[11px] text-[13px] font-semibold transition-opacity hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.4)", color: "oklch(0.22 0.04 160)", borderColor: "transparent" }}
            >
              <Calendar size={14} /> Calendar
            </Link>
          </div>
        </div>

        {/* Decorative art */}
        <svg
          className="absolute right-[-10px] bottom-[-10px] w-[220px] h-[160px] pointer-events-none opacity-[0.92]"
          viewBox="0 0 220 160"
        >
          <circle cx="170" cy="40" r="50" fill="white" opacity="0.25" />
          <circle cx="200" cy="120" r="36" fill="white" opacity="0.2" />
          <rect x="90" y="80" width="80" height="60" rx="12" fill="white" opacity="0.25" />
          <g transform="translate(110, 60)">
            <rect x="0" y="50" width="80" height="14" rx="3" fill="oklch(0.55 0.13 295)" />
            <rect x="6" y="36" width="70" height="14" rx="3" fill="oklch(0.55 0.12 50)" />
            <rect x="12" y="22" width="60" height="14" rx="3" fill="oklch(0.55 0.13 230)" />
            <rect x="20" y="8" width="50" height="14" rx="3" fill="oklch(0.55 0.13 10)" />
          </g>
        </svg>
      </section>

      {/* KPI row */}
      <section className="grid grid-cols-4 gap-4">
        {/* Progress */}
        <StatCard
          label="Course progress"
          value={`${overallPct}%`}
          delta={
            totalModules > 0 ? (
              <span className="text-ok flex items-center gap-1">
                <ArrowUp size={11} /> {completedModules}/{totalModules} modules
              </span>
            ) : undefined
          }
        >
          <Donut
            size={84}
            stroke={9}
            pct={overallPct / 100}
            label={`${overallPct}%`}
            sub="overall"
          />
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] text-ink-3 font-medium">Course progress</div>
            <div className="font-bold text-sm mt-1.5">{completedModules}/{totalModules} modules passed</div>
            {totalModules > 0 && (
              <div className="text-[11.5px] font-bold mt-1.5 flex items-center gap-1" style={{ color: "var(--ok)" }}>
                <ArrowUp size={11} /> {overallPct}% complete
              </div>
            )}
          </div>
        </StatCard>

        {/* Attendance */}
        <StatCard label="Attendance" value={avgAttendance != null ? `${avgAttendance}%` : "—"}>
          <Donut
            size={84}
            stroke={9}
            pct={(avgAttendance ?? 0) / 100}
            color="var(--info)"
            track="var(--surface-3)"
            label={avgAttendance != null ? `${avgAttendance}%` : "—"}
            sub="attended"
          />
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] text-ink-3 font-medium">Attendance (term)</div>
            <div className="font-bold text-sm mt-1.5">Goal 80%</div>
            <div
              className="text-[11.5px] font-bold mt-1.5 flex items-center gap-1"
              style={{ color: avgAttendance != null && avgAttendance < 80 ? "var(--bad)" : "var(--ink-3)" }}
            >
              <Info size={11} />
              {avgAttendance != null && avgAttendance < 80 ? "Below goal — speak to tutor" : "On track"}
            </div>
          </div>
        </StatCard>

        {/* Due assignments */}
        <StatCard
          label="Open assignments"
          value={openAssignments.length}
          icon={
            <StatIcon tone="peach">
              <CheckCircle size={24} />
            </StatIcon>
          }
          delta={
            overdueCount > 0 ? (
              <span className="flex items-center gap-1" style={{ color: "var(--bad)" }}>
                <AlertTriangle size={11} /> {overdueCount} overdue
              </span>
            ) : (
              <span className="text-ok">All on track</span>
            )
          }
        />

        {/* Unread chat */}
        <StatCard
          label="Chat notifications"
          value={unreadChats}
          icon={
            <StatIcon tone="lav">
              <Star size={24} />
            </StatIcon>
          }
          delta={
            <span className="text-ink-3">module group chats</span>
          }
        />
      </section>

      {/* Main + side layout */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 360px" }}>
        {/* Left column */}
        <div className="flex flex-col gap-4">

          {/* Attention items */}
          {data.attentionItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle count={data.attentionItems.length}>Today, in order</CardTitle>
                <span className="text-[11.5px]" style={{ color: "var(--ink-4)" }}>Guided learning</span>
              </CardHeader>
              <p className="text-[12.5px] text-ink-3 mb-3.5 -mt-2">
                Ranked by deadline and priority. These are <strong>supportive</strong> — pick one to focus on.
              </p>
              <div className="flex flex-col gap-2.5">
                {data.attentionItems.map((a, i) => {
                  const tone = attentionItemTone(a.kind);
                  const Icon = a.kind === "LOW_ATTENDANCE" ? AlertTriangle
                    : a.kind === "OVERDUE_ASSIGNMENT" ? Clock
                    : a.kind === "FAILED_FINAL_GRADE" ? AlertTriangle
                    : Clock;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3.5 py-3 rounded-xl"
                      style={{ background: "var(--surface-2)" }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                        style={{ background: tone.bg, color: tone.fg }}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[13.5px] text-ink">{a.message}</div>
                      </div>
                      <Chip variant={tone.chipVariant}>{tone.chipLabel}</Chip>
                      <div className="w-8 h-8 rounded-lg grid place-items-center text-ink-3 hover:bg-surface-3 cursor-pointer flex-shrink-0">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Due assignments */}
          <Card>
            <CardHeader>
              <CardTitle count={data.dueAssignments.length}>Assignments</CardTitle>
              <Link
                href="/student/modules"
                className="text-[12px] font-semibold flex items-center gap-1 text-ink-3 hover:text-ink transition-colors"
              >
                All modules <ChevronRight size={12} />
              </Link>
            </CardHeader>
            {data.dueAssignments.length === 0 ? (
              <EmptyState title="No assignments" body="Nothing due right now. Check back later." />
            ) : (
              <div className="overflow-auto rounded-[12px] border border-line">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {["Assignment", "Module", "Due", "Status"].map(h => (
                        <th
                          key={h}
                          className="text-left px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] border-b border-line"
                          style={{ color: "var(--ink-4)", background: "var(--surface-2)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.dueAssignments.slice(0, 6).map((a) => (
                      <tr
                        key={a.id}
                        className="border-b border-line last:border-0 hover:bg-surface-2 transition-colors"
                      >
                        <td className="px-3.5 py-3">
                          <div className="font-semibold text-[13px] text-ink">{a.title}</div>
                          <div className="text-[11.5px] text-ink-3 mt-0.5">{a.moduleName}</div>
                        </td>
                        <td className="px-3.5 py-3">
                          <Chip variant="ghost" size="sm">{a.moduleName.slice(0, 15)}</Chip>
                        </td>
                        <td className="px-3.5 py-3 text-[12.5px] font-medium tabular-nums text-ink-2">
                          {a.deadline < now
                            ? <span style={{ color: "var(--bad)" }}>Overdue</span>
                            : a.deadline.toLocaleDateString("en", { day: "numeric", month: "short" })}
                        </td>
                        <td className="px-3.5 py-3">
                          <AssignmentStatusChip a={a} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Course progress */}
          {data.courseProgress.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Course progression</CardTitle>
              </CardHeader>
              <div className="flex flex-col gap-3">
                {data.courseProgress.map((cp) => {
                  const pct = cp.totalModules > 0
                    ? Math.round((cp.completedModules / cp.totalModules) * 100)
                    : 0;
                  return (
                    <div key={cp.academicLevelId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-[12.5px] text-ink">{cp.academicLevelLabel}</span>
                        <span className="text-[11.5px] text-ink-3 font-medium tabular-nums">
                          {cp.completedModules}/{cp.totalModules} passed
                        </span>
                      </div>
                      <ProgressBar value={cp.completedModules} max={cp.totalModules} />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Attendance per module */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance</CardTitle>
            </CardHeader>
            {data.attendanceByModuleOffering.length === 0 ? (
              <EmptyState title="No attendance data" body="Attendance will appear once sessions are recorded." />
            ) : (
              <div className="flex flex-col gap-2">
                {data.attendanceByModuleOffering.map((att) => (
                  <div key={att.moduleOfferingId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12.5px] font-medium text-ink truncate pr-2">{att.moduleName}</span>
                      <span
                        className="text-[12.5px] font-bold tabular-nums flex-shrink-0"
                        style={{
                          color: att.percentage == null ? "var(--ink-4)"
                            : att.percentage < 80 ? "var(--bad)"
                            : "var(--ok)",
                        }}
                      >
                        {att.percentage != null ? `${att.percentage}%` : "—"}
                      </span>
                    </div>
                    {att.percentage != null && (
                      <ProgressBar
                        value={att.percentage}
                        color={att.percentage < 80 ? "var(--bad)" : "var(--primary-strong)"}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            {data.attendanceByModuleOffering.some(a => a.percentage != null && a.percentage < 80) && (
              <Banner variant="warn" icon={<AlertTriangle size={14} />} className="mt-3">
                Some modules are below the 80% attendance goal.
              </Banner>
            )}
          </Card>

          {/* Released marks */}
          <Card>
            <CardHeader>
              <CardTitle count={data.releasedMarks.length}>Recent marks</CardTitle>
            </CardHeader>
            {data.releasedMarks.length === 0 ? (
              <EmptyState title="No marks yet" body="Released marks will appear here." />
            ) : (
              <div className="flex flex-col gap-2.5">
                {data.releasedMarks.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[13px] text-ink truncate">{m.assessmentComponentTitle}</div>
                      <div className="text-[11.5px] text-ink-3 mt-0.5">{m.moduleName}</div>
                    </div>
                    <Chip variant={m.score / m.maximumMark >= 0.5 ? "ok" : "bad"} className="flex-shrink-0 ml-2">
                      {m.score}/{m.maximumMark}
                    </Chip>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Final grades */}
          {data.releasedFinalGrades.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle count={data.releasedFinalGrades.length}>Final grades</CardTitle>
              </CardHeader>
              <div className="flex flex-col gap-2">
                {data.releasedFinalGrades.map((fg) => (
                  <div
                    key={fg.moduleOfferingId}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <span className="text-[13px] font-medium text-ink truncate pr-2">{fg.moduleName}</span>
                    <Chip variant={fg.isPassing ? "ok" : "bad"} dot className="flex-shrink-0">
                      {fg.percentage}% {fg.isPassing ? "Pass" : "Not passed"}
                    </Chip>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Upcoming events */}
          {data.upcomingCalendarEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle count={data.upcomingCalendarEvents.length}>Upcoming events</CardTitle>
                <Link
                  href="/student/academic-calendar"
                  className="text-[12px] font-semibold text-ink-3 hover:text-ink flex items-center gap-1"
                >
                  Calendar <ChevronRight size={12} />
                </Link>
              </CardHeader>
              <div className="flex flex-col gap-2">
                {data.upcomingCalendarEvents.slice(0, 4).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl hover:bg-surface-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-[13px] text-ink truncate">{e.title}</div>
                      <div className="text-[11.5px] text-ink-3 mt-0.5 capitalize">
                        {e.kind.replace(/_/g, " ").toLowerCase()}
                      </div>
                    </div>
                    <span className="text-[11.5px] text-ink-4 font-medium flex-shrink-0">
                      {e.startAt.toLocaleDateString("en", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Unread chats */}
          {unreadChats > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Unread chats</CardTitle>
              </CardHeader>
              <div className="flex flex-col gap-2">
                {data.chatActivity.filter(c => c.hasUnread).map(c => (
                  <Link
                    key={c.chatId}
                    href={`/student/modules/${c.moduleOfferingId}/chat`}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-2 transition-colors"
                  >
                    <span className="text-[13px] font-medium text-ink">{c.moduleName}</span>
                    <Chip variant="bad" size="sm">New messages</Chip>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
