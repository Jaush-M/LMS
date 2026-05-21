import { requireAuthPage } from "@/lib/auth-guard";
import { getCalendarFeed } from "@/lib/academic-calendar";
import type { CalendarFeedItem } from "@/lib/academic-calendar";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty";

const MVT_OFFSET_MS = 5 * 60 * 60 * 1000;

function toMVT(date: Date) {
  return new Date(date.getTime() + MVT_OFFSET_MS);
}

function dateKey(date: Date): string {
  return toMVT(date).toISOString().slice(0, 10);
}

function formatTime(date: Date): string {
  const d = toMVT(date);
  const h = d.getUTCHours().toString().padStart(2, "0");
  const m = d.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function monthLabel(monthKey: string): string {
  const [y, mo] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleString("en", { month: "long", year: "numeric" });
}

function dayLabel(dk: string): { name: string; num: string } {
  const [y, mo, d] = dk.split("-").map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  return {
    name: date.toLocaleString("en", { weekday: "short" }),
    num: d.toString(),
  };
}

const KIND_LABEL: Record<string, string> = {
  INSTITUTION_EVENT: "Institution",
  COURSE_OFFERING_EVENT: "Course",
  MODULE_OFFERING_EVENT: "Module",
  CLASS_SESSION: "Class",
  ASSIGNMENT_DEADLINE: "Deadline",
};

type ChipVariant = "lav" | "peach" | "sky" | "bad" | "default";

const KIND_CHIP: Record<string, ChipVariant> = {
  INSTITUTION_EVENT: "peach",
  COURSE_OFFERING_EVENT: "sky",
  MODULE_OFFERING_EVENT: "lav",
  CLASS_SESSION: "sky",
  ASSIGNMENT_DEADLINE: "bad",
};

const KIND_ACCENT: Record<string, string> = {
  INSTITUTION_EVENT: "var(--peach-ink)",
  COURSE_OFFERING_EVENT: "var(--sky-ink)",
  MODULE_OFFERING_EVENT: "var(--lav-ink)",
  CLASS_SESSION: "var(--sky-ink)",
  ASSIGNMENT_DEADLINE: "var(--bad)",
};

export default async function StudentAcademicCalendarPage() {
  const { account } = await requireAuthPage({ roles: ["STUDENT"] });
  const feed = await getCalendarFeed(account.id);

  const todayKey = dateKey(new Date());

  const byDate = new Map<string, CalendarFeedItem[]>();
  for (const item of feed) {
    const k = dateKey(item.startAt);
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k)!.push(item);
  }
  const sortedDates = [...byDate.keys()].sort();

  const byMonth = new Map<string, string[]>();
  for (const dk of sortedDates) {
    const mk = dk.slice(0, 7);
    if (!byMonth.has(mk)) byMonth.set(mk, []);
    byMonth.get(mk)!.push(dk);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1
          className="text-[22px] font-extrabold tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
        >
          Academic Calendar
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
          Upcoming classes, deadlines, and events for your programme
        </p>
      </div>

      {feed.length === 0 ? (
        <EmptyState title="No upcoming events" body="Your calendar is empty — check back later." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          {[...byMonth.entries()].map(([monthKey, datKeys]) => (
            <div key={monthKey}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ink-3)",
                  whiteSpace: "nowrap",
                }}>
                  {monthLabel(monthKey)}
                </span>
                <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {datKeys.map((dk) => {
                  const items = byDate.get(dk)!;
                  const { name: dayName, num: dayNum } = dayLabel(dk);
                  const isToday = dk === todayKey;
                  const isPast = dk < todayKey;

                  return (
                    <div
                      key={dk}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "60px 1fr",
                        gap: 14,
                        alignItems: "start",
                        padding: "10px 0",
                        borderBottom: "1px solid var(--line-2)",
                        opacity: isPast ? 0.5 : 1,
                      }}
                    >
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        paddingTop: 6,
                        gap: 1,
                      }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          color: isToday ? "var(--primary-strong)" : "var(--ink-4)",
                        }}>
                          {dayName}
                        </span>
                        <span style={{
                          fontSize: 26,
                          fontWeight: 800,
                          lineHeight: 1,
                          color: isToday ? "var(--primary-strong)" : "var(--ink-2)",
                          fontFamily: "var(--font-display)",
                        }}>
                          {dayNum}
                        </span>
                        {isToday && (
                          <span style={{
                            marginTop: 2,
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: "var(--primary-strong)",
                            display: "inline-block",
                          }} />
                        )}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
                        {items.map((item) => {
                          const accent = KIND_ACCENT[item.kind] ?? "var(--ink-4)";
                          const timeRange = formatTime(item.startAt) +
                            (item.finishAt ? ` – ${formatTime(item.finishAt)}` : "");

                          return (
                            <div
                              key={item.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "9px 14px",
                                background: "var(--surface-card)",
                                border: "1px solid var(--line)",
                                borderLeftWidth: 3,
                                borderLeftColor: accent,
                                borderRadius: 10,
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontWeight: 600,
                                  fontSize: 13.5,
                                  color: "var(--ink)",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}>
                                  {item.title}
                                </div>
                                <div style={{
                                  fontSize: 11.5,
                                  color: "var(--ink-3)",
                                  marginTop: 2,
                                  fontFamily: "var(--font-code)",
                                }}>
                                  {timeRange} MVT
                                </div>
                              </div>
                              <Chip variant={KIND_CHIP[item.kind] ?? "default"} size="sm" dot>
                                {KIND_LABEL[item.kind] ?? item.kind}
                              </Chip>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
