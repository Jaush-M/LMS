import Link from "next/link";

import { submitAssignment } from "@/app/student/actions";
import { SignOutButton } from "@/components/sign-out-button";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/session";

export const dynamic = "force-dynamic";

type StudentPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function inputClass() {
  return "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

function Notice({
  success,
  error,
}: {
  success?: string;
  error?: string;
}) {
  if (!success && !error) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border p-4 text-sm ${
        error
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {error ?? success}
    </div>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
    >
      {children}
    </button>
  );
}

function formatDateTime(date: Date) {
  return date.toLocaleString("en-MV", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function attendancePercentage(
  records: { status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" }[],
) {
  const counted = records.filter((record) => record.status !== "EXCUSED");
  const attended = counted.filter(
    (record) => record.status === "PRESENT" || record.status === "LATE",
  );

  return counted.length === 0
    ? null
    : Math.round((attended.length / counted.length) * 100);
}

export default async function StudentPage({ searchParams }: StudentPageProps) {
  const { account } = await requireRoles(["STUDENT"]);

  if (!account.studentProfile) {
    return null;
  }

  const params = await searchParams;
  const success =
    typeof params?.success === "string" ? params.success : undefined;
  const error = typeof params?.error === "string" ? params.error : undefined;

  const enrolments = await prisma.enrolment.findMany({
    where: {
      studentId: account.studentProfile.id,
      status: "ACTIVE",
    },
    include: {
      moduleExceptions: true,
      courseOffering: {
        include: {
          course: true,
          intake: true,
          moduleOfferings: {
            include: {
              templateModule: {
                include: {
                  module: true,
                  academicLevel: true,
                },
              },
              groupChat: {
                include: {
                  messages: {
                    where: { status: "ACTIVE" },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                  },
                },
              },
            },
            orderBy: [
              { templateModule: { academicLevel: { sortOrder: "asc" } } },
              { templateModule: { sortOrder: "asc" } },
            ],
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const visibleModuleOfferings = enrolments.flatMap((enrolment) => {
    const excludedModuleIds = new Set(
      enrolment.moduleExceptions
        .filter((exception) => exception.type === "EXCLUDE")
        .map((exception) => exception.moduleOfferingId),
    );

    return enrolment.courseOffering.moduleOfferings
      .filter((moduleOffering) => !excludedModuleIds.has(moduleOffering.id))
      .map((moduleOffering) => ({
        enrolment,
        moduleOffering,
      }));
  });

  const selectedId =
    typeof params?.moduleOfferingId === "string"
      ? params.moduleOfferingId
      : visibleModuleOfferings[0]?.moduleOffering.id;
  const selectedModule = visibleModuleOfferings.find(
    ({ moduleOffering }) => moduleOffering.id === selectedId,
  );

  const detail = selectedModule
    ? await prisma.moduleOffering.findUnique({
        where: { id: selectedModule.moduleOffering.id },
        include: {
          courseOffering: { include: { course: true, intake: true } },
          templateModule: {
            include: {
              module: true,
              academicLevel: true,
            },
          },
          contentSections: {
            where: { status: "ACTIVE" },
            include: {
              contentItems: {
                where: { visibility: "PUBLISHED" },
                include: {
                  sharedLinks: true,
                  fileAssets: true,
                },
                orderBy: { sortOrder: "asc" },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
          assignments: {
            where: { status: "PUBLISHED" },
            include: {
              assessmentComponent: true,
              fileAssets: true,
              submissions: {
                where: {
                  studentId: account.studentProfile.id,
                  isActive: true,
                },
                include: {
                  fileAssets: true,
                  componentMark: true,
                },
                take: 1,
              },
            },
            orderBy: { deadlineAt: "asc" },
          },
          classSessions: {
            where: { isAttendanceRequired: true },
            include: {
              sessionType: true,
              attendanceRecords: {
                where: { studentId: account.studentProfile.id },
              },
            },
            orderBy: { startsAt: "desc" },
          },
          finalGrades: {
            where: {
              studentId: account.studentProfile.id,
              status: "RELEASED",
            },
            orderBy: { releasedAt: "desc" },
          },
          assessmentComponents: {
            include: {
              componentMarks: {
                where: {
                  studentId: account.studentProfile.id,
                  status: "RELEASED",
                },
                orderBy: { releasedAt: "desc" },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      })
    : null;

  const attendanceRecords =
    detail?.classSessions.flatMap((session) => session.attendanceRecords) ?? [];
  const attendance = attendancePercentage(attendanceRecords);
  const latestGrade = detail?.finalGrades[0];

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Student Workspace
            </p>
            <h1 className="text-xl font-semibold text-slate-950">
              {account.fullName}
            </h1>
            <p className="text-sm text-slate-600">
              {account.generatedIdentifier} · {account.institutionalEmail}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <aside className="space-y-4">
          <Notice success={success} error={error} />
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-4">
              <h2 className="font-semibold text-slate-950">My Courses</h2>
              <p className="mt-1 text-sm text-slate-600">
                {enrolments.length} active enrolment(s)
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {enrolments.map((enrolment) => {
                const excludedModuleIds = new Set(
                  enrolment.moduleExceptions
                    .filter((exception) => exception.type === "EXCLUDE")
                    .map((exception) => exception.moduleOfferingId),
                );
                const modules = enrolment.courseOffering.moduleOfferings.filter(
                  (moduleOffering) => !excludedModuleIds.has(moduleOffering.id),
                );

                return (
                  <div key={enrolment.id} className="p-4">
                    <h3 className="font-semibold text-slate-950">
                      {enrolment.courseOffering.course.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {enrolment.courseOffering.intake.name}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {modules.map((moduleOffering) => {
                        const selected = moduleOffering.id === detail?.id;
                        const hasChatActivity =
                          (moduleOffering.groupChat?.messages.length ?? 0) > 0;

                        return (
                          <Link
                            key={moduleOffering.id}
                            href={`/student?moduleOfferingId=${moduleOffering.id}`}
                            className={`relative rounded-lg border p-3 text-sm font-medium ${
                              selected
                                ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                                : "border-slate-200 bg-slate-50 text-slate-800 hover:border-emerald-300"
                            }`}
                          >
                            <span className="block truncate">
                              {moduleOffering.templateModule.module.code}
                            </span>
                            <span className="mt-1 block text-xs font-normal text-slate-600">
                              {moduleOffering.templateModule.academicLevel.label}
                            </span>
                            {hasChatActivity ? (
                              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-600" />
                            ) : null}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {detail ? (
          <div className="space-y-8">
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                    {detail.templateModule.academicLevel.label}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                    {detail.templateModule.module.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {detail.courseOffering.course.name} ·{" "}
                    {detail.courseOffering.intake.name}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg border border-slate-200 px-4 py-3">
                    <p className="text-xs font-medium text-slate-500">
                      Attendance
                    </p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">
                      {attendance === null ? "N/A" : `${attendance}%`}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 px-4 py-3">
                    <p className="text-xs font-medium text-slate-500">
                      Assignments
                    </p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">
                      {detail.assignments.length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 px-4 py-3">
                    <p className="text-xs font-medium text-slate-500">
                      Final grade
                    </p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">
                      {latestGrade ? `${String(latestGrade.percentage)}%` : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
              {attendance !== null && attendance < 80 ? (
                <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                  Attendance is below 80%.
                </p>
              ) : null}
              {latestGrade && Number(latestGrade.percentage) < 50 ? (
                <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                  Released final grade is below 50%.
                </p>
              ) : null}
            </section>

            <Section title="Content">
              <div className="rounded-lg border border-slate-200 bg-white">
                {detail.contentSections.length === 0 ? (
                  <p className="p-4 text-sm text-slate-600">
                    No published content yet.
                  </p>
                ) : (
                  detail.contentSections.map((section) => (
                    <div
                      key={section.id}
                      className="border-b border-slate-100 p-4 last:border-b-0"
                    >
                      <h3 className="font-semibold text-slate-950">
                        {section.title}
                      </h3>
                      <div className="mt-3 grid gap-3">
                        {section.contentItems.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-md border border-slate-100 bg-slate-50 p-3"
                          >
                            <p className="font-medium text-slate-950">
                              {item.title}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {item.bodyRichText}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                              {item.sharedLinks.map((link) => (
                                <a
                                  key={link.id}
                                  href={link.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-full bg-white px-2 py-1 text-emerald-700"
                                >
                                  {link.label ?? link.url}
                                </a>
                              ))}
                              {item.fileAssets.map((file) => (
                                <span
                                  key={file.id}
                                  className="rounded-full bg-white px-2 py-1 text-slate-700"
                                >
                                  {file.originalFilename}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Section>

            <Section title="Assignments">
              <div className="grid gap-4">
                {detail.assignments.map((assignment) => {
                  const submission = assignment.submissions[0];
                  const marked =
                    submission?.status === "MARKED" || submission?.componentMark;

                  return (
                    <div
                      key={assignment.id}
                      className="rounded-lg border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-slate-950">
                            {assignment.title}
                          </h3>
                          <p className="mt-1 text-sm text-slate-600">
                            Due {formatDateTime(assignment.deadlineAt)} ·{" "}
                            {String(assignment.assessmentComponent.weightPercent)}
                            %
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {submission ? submission.status : "NOT SUBMITTED"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        {assignment.instructionsRichText}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                        {assignment.fileAssets.map((file) => (
                          <span
                            key={file.id}
                            className="rounded-full bg-slate-100 px-2 py-1"
                          >
                            {file.originalFilename}
                          </span>
                        ))}
                        {submission?.fileAssets.map((file) => (
                          <span
                            key={file.id}
                            className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-800"
                          >
                            Submitted: {file.originalFilename}
                          </span>
                        ))}
                      </div>
                      {submission?.componentMark ? (
                        <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                          Released mark: {String(submission.componentMark.mark)}
                        </div>
                      ) : null}
                      {!marked ? (
                        <form
                          action={submitAssignment}
                          className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"
                        >
                          <input
                            type="hidden"
                            name="moduleOfferingId"
                            value={detail.id}
                          />
                          <input
                            type="hidden"
                            name="assignmentId"
                            value={assignment.id}
                          />
                          <input
                            name="file"
                            type="file"
                            required
                            className={inputClass()}
                          />
                          <SubmitButton>
                            {submission ? "Replace submission" : "Submit"}
                          </SubmitButton>
                        </form>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section title="Marks And Attendance">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 p-4">
                    <h3 className="font-semibold text-slate-950">
                      Released Marks
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {detail.assessmentComponents.map((component) => (
                      <div key={component.id} className="p-4">
                        <p className="font-medium text-slate-950">
                          {component.title}
                        </p>
                        <p className="text-sm text-slate-600">
                          {component.componentMarks[0]
                            ? `${String(component.componentMarks[0].mark)} / ${String(component.maximumMark)}`
                            : "No released mark"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 p-4">
                    <h3 className="font-semibold text-slate-950">Attendance</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {detail.classSessions.map((session) => {
                      const record = session.attendanceRecords[0];

                      return (
                        <div
                          key={session.id}
                          className="flex items-center justify-between gap-4 p-4"
                        >
                          <div>
                            <p className="font-medium text-slate-950">
                              {session.title}
                            </p>
                            <p className="text-sm text-slate-600">
                              {formatDateTime(session.startsAt)}
                            </p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {record?.status ?? "UNMARKED"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Section>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">
              No active modules
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Modules appear here after an administrator enrolls you into a
              course offering.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
