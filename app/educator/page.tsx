import Link from "next/link";

import {
  createAssessmentComponent,
  createAssignment,
  createContentItem,
  createContentSection,
  extendAssignmentDeadline,
  markAttendance,
} from "@/app/educator/actions";
import { SignOutButton } from "@/components/sign-out-button";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/session";

export const dynamic = "force-dynamic";

type EducatorPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const visibilityStatuses = ["DRAFT", "PUBLISHED"];
const assignmentStatuses = ["DRAFT", "PUBLISHED"];
const componentTypes = ["ONLINE_ASSIGNMENT", "OFFLINE_ASSESSMENT"];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

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

function formatDateTime(date: Date) {
  return date.toLocaleString("en-MV", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EducatorPage({ searchParams }: EducatorPageProps) {
  const { account } = await requireRoles(["EDUCATOR"]);

  if (!account.educatorProfile) {
    return null;
  }

  const params = await searchParams;
  const success =
    typeof params?.success === "string" ? params.success : undefined;
  const error = typeof params?.error === "string" ? params.error : undefined;

  const moduleOfferings = await prisma.moduleOffering.findMany({
    where: {
      primaryEducatorId: account.educatorProfile.id,
      status: { in: ["ACTIVE", "PLANNED"] },
    },
    include: {
      courseOffering: {
        include: {
          course: true,
          intake: true,
          enrolments: { where: { status: "ACTIVE" }, select: { id: true } },
        },
      },
      templateModule: {
        include: {
          module: true,
          academicLevel: true,
        },
      },
      groupChat: {
        include: {
          messages: {
            where: {
              mentions: { some: { mentionedUserId: account.id } },
              status: "ACTIVE",
            },
            take: 3,
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
    orderBy: [
      { courseOffering: { startsAt: "asc" } },
      { templateModule: { sortOrder: "asc" } },
    ],
  });

  const selectedId =
    typeof params?.moduleOfferingId === "string"
      ? params.moduleOfferingId
      : moduleOfferings[0]?.id;
  const selectedModule =
    moduleOfferings.find((moduleOffering) => moduleOffering.id === selectedId) ??
    moduleOfferings[0];

  const detail = selectedModule
    ? await prisma.moduleOffering.findFirst({
        where: {
          id: selectedModule.id,
          primaryEducatorId: account.educatorProfile.id,
        },
        include: {
          courseOffering: {
            include: {
              course: true,
              intake: true,
              enrolments: {
                where: { status: "ACTIVE" },
                include: {
                  student: { include: { userAccount: true } },
                  moduleExceptions: true,
                },
                orderBy: { enrolledAt: "asc" },
              },
            },
          },
          templateModule: {
            include: {
              module: true,
              academicLevel: true,
            },
          },
          contentSections: {
            include: {
              contentItems: {
                include: {
                  fileAssets: true,
                  sharedLinks: true,
                },
                orderBy: { sortOrder: "asc" },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
          assessmentComponents: {
            include: { assignment: true },
            orderBy: { sortOrder: "asc" },
          },
          assignments: {
            include: {
              assessmentComponent: true,
              contentSection: true,
              fileAssets: true,
              deadlineExtensions: { orderBy: { createdAt: "desc" } },
              _count: { select: { submissions: true } },
            },
            orderBy: { deadlineAt: "asc" },
          },
          classSessions: {
            include: {
              sessionType: true,
              attendanceRecords: true,
              educatorAttendance: true,
            },
            orderBy: { startsAt: "desc" },
            take: 8,
          },
        },
      })
    : null;

  const componentWeightTotal =
    detail?.assessmentComponents.reduce(
      (sum, component) => sum + Number(component.weightPercent),
      0,
    ) ?? 0;
  const availableAssignmentComponents =
    detail?.assessmentComponents.filter(
      (component) =>
        component.type === "ONLINE_ASSIGNMENT" && component.assignment === null,
    ) ?? [];

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Educator Workspace
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

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[320px_1fr] lg:px-8">
        <aside className="space-y-4">
          <Notice success={success} error={error} />
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-4">
              <h2 className="font-semibold text-slate-950">Assigned Modules</h2>
              <p className="mt-1 text-sm text-slate-600">
                {moduleOfferings.length} active or planned module offering(s)
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {moduleOfferings.map((moduleOffering) => {
                const mentionCount =
                  moduleOffering.groupChat?.messages.length ?? 0;
                const selected = moduleOffering.id === detail?.id;

                return (
                  <Link
                    key={moduleOffering.id}
                    href={`/educator?moduleOfferingId=${moduleOffering.id}`}
                    className={`block px-4 py-3 ${
                      selected ? "bg-emerald-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">
                          {moduleOffering.templateModule.module.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {moduleOffering.courseOffering.course.name}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {moduleOffering.templateModule.academicLevel.label} ·{" "}
                          {moduleOffering.courseOffering.intake.name}
                        </p>
                      </div>
                      {mentionCount > 0 ? (
                        <span className="rounded-full bg-red-600 px-2 py-1 text-xs font-semibold text-white">
                          @{mentionCount}
                        </span>
                      ) : null}
                    </div>
                  </Link>
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
                    <p className="text-xs font-medium text-slate-500">Students</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">
                      {detail.courseOffering.enrolments.length}
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
                    <p className="text-xs font-medium text-slate-500">Weight</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">
                      {componentWeightTotal}%
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <Section title="Module Content">
              <div className="grid gap-4 lg:grid-cols-2">
                <form
                  action={createContentSection}
                  className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
                >
                  <h3 className="font-semibold text-slate-950">
                    Create Section
                  </h3>
                  <input
                    type="hidden"
                    name="moduleOfferingId"
                    value={detail.id}
                  />
                  <Field label="Section title">
                    <input
                      name="title"
                      required
                      placeholder="Week 2"
                      className={inputClass()}
                    />
                  </Field>
                  <SubmitButton>Create section</SubmitButton>
                </form>

                <form
                  action={createContentItem}
                  className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
                >
                  <h3 className="font-semibold text-slate-950">Add Content</h3>
                  <input
                    type="hidden"
                    name="moduleOfferingId"
                    value={detail.id}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Section">
                      <select
                        name="contentSectionId"
                        required
                        className={inputClass()}
                      >
                        {detail.contentSections.map((section) => (
                          <option key={section.id} value={section.id}>
                            {section.title}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Visibility">
                      <select name="visibility" required className={inputClass()}>
                        {visibilityStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="Title">
                    <input name="title" required className={inputClass()} />
                  </Field>
                  <Field label="Body">
                    <textarea
                      name="bodyRichText"
                      rows={4}
                      className={inputClass()}
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Shared link URL">
                      <input name="linkUrl" type="url" className={inputClass()} />
                    </Field>
                    <Field label="Link label">
                      <input name="linkLabel" className={inputClass()} />
                    </Field>
                  </div>
                  <Field label="File">
                    <input name="file" type="file" className={inputClass()} />
                  </Field>
                  <SubmitButton>Save content</SubmitButton>
                </form>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white">
                {detail.contentSections.length === 0 ? (
                  <p className="p-4 text-sm text-slate-600">
                    No content sections yet.
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
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-slate-950">
                                  {item.title}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {item.bodyRichText}
                                </p>
                              </div>
                              <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                                {item.visibility}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
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
                                  className="rounded-full bg-white px-2 py-1"
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

            <Section title="Assignments And Assessment">
              <div className="grid gap-4 lg:grid-cols-2">
                <form
                  action={createAssessmentComponent}
                  className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
                >
                  <h3 className="font-semibold text-slate-950">
                    Add Assessment Component
                  </h3>
                  <input
                    type="hidden"
                    name="moduleOfferingId"
                    value={detail.id}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Title">
                      <input name="title" required className={inputClass()} />
                    </Field>
                    <Field label="Type">
                      <select name="type" required className={inputClass()}>
                        {componentTypes.map((type) => (
                          <option key={type} value={type}>
                            {type.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Weight %">
                      <input
                        name="weightPercent"
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        required
                        className={inputClass()}
                      />
                    </Field>
                    <Field label="Maximum mark">
                      <input
                        name="maximumMark"
                        type="number"
                        min="1"
                        step="0.01"
                        defaultValue={100}
                        required
                        className={inputClass()}
                      />
                    </Field>
                  </div>
                  <SubmitButton>Add component</SubmitButton>
                </form>

                <form
                  action={createAssignment}
                  className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
                >
                  <h3 className="font-semibold text-slate-950">
                    Create Assignment
                  </h3>
                  <input
                    type="hidden"
                    name="moduleOfferingId"
                    value={detail.id}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Section">
                      <select name="contentSectionId" className={inputClass()}>
                        <option value="">None</option>
                        {detail.contentSections.map((section) => (
                          <option key={section.id} value={section.id}>
                            {section.title}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Existing component">
                      <select
                        name="assessmentComponentId"
                        className={inputClass()}
                      >
                        <option value="">Create new component</option>
                        {availableAssignmentComponents.map((component) => (
                          <option key={component.id} value={component.id}>
                            {component.title} · {String(component.weightPercent)}%
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Status">
                      <select name="status" required className={inputClass()}>
                        {assignmentStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Deadline">
                      <input
                        name="deadlineAt"
                        type="datetime-local"
                        required
                        className={inputClass()}
                      />
                    </Field>
                  </div>
                  <Field label="Title">
                    <input name="title" required className={inputClass()} />
                  </Field>
                  <Field label="Instructions">
                    <textarea
                      name="instructionsRichText"
                      rows={4}
                      className={inputClass()}
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="New component weight %">
                      <input
                        name="weightPercent"
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        placeholder="Required only if creating new"
                        className={inputClass()}
                      />
                    </Field>
                    <Field label="New maximum mark">
                      <input
                        name="maximumMark"
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="100"
                        className={inputClass()}
                      />
                    </Field>
                  </div>
                  <Field label="Attachment">
                    <input name="file" type="file" className={inputClass()} />
                  </Field>
                  <SubmitButton>Create assignment</SubmitButton>
                </form>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                <div className="rounded-lg border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 p-4">
                    <h3 className="font-semibold text-slate-950">
                      Assessment Components
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Total weight {componentWeightTotal}%
                    </p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {detail.assessmentComponents.map((component) => (
                      <div key={component.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-950">
                              {component.title}
                            </p>
                            <p className="text-sm text-slate-600">
                              {component.type.replaceAll("_", " ")}
                            </p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {String(component.weightPercent)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 p-4">
                    <h3 className="font-semibold text-slate-950">
                      Assignments
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {detail.assignments.map((assignment) => (
                      <div key={assignment.id} className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-950">
                              {assignment.title}
                            </p>
                            <p className="text-sm text-slate-600">
                              Due {formatDateTime(assignment.deadlineAt)} ·{" "}
                              {assignment._count.submissions} submission(s)
                            </p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {assignment.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                          {assignment.fileAssets.map((file) => (
                            <span
                              key={file.id}
                              className="rounded-full bg-slate-100 px-2 py-1"
                            >
                              {file.originalFilename}
                            </span>
                          ))}
                          {assignment.deadlineExtensions.length > 0 ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-800">
                              {assignment.deadlineExtensions.length} extension(s)
                            </span>
                          ) : null}
                        </div>
                        <form
                          action={extendAssignmentDeadline}
                          className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
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
                            name="newDeadlineAt"
                            type="datetime-local"
                            required
                            className={inputClass()}
                          />
                          <input
                            name="reason"
                            required
                            placeholder="Reason"
                            className={inputClass()}
                          />
                          <SubmitButton>Extend</SubmitButton>
                        </form>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Class List">
              <div className="rounded-lg border border-slate-200 bg-white">
                <div className="max-h-96 divide-y divide-slate-100 overflow-auto">
                  {detail.courseOffering.enrolments.map((enrolment) => (
                    <div
                      key={enrolment.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-slate-950">
                          {enrolment.student.userAccount.fullName}
                        </p>
                        <p className="text-sm text-slate-600">
                          {enrolment.student.userAccount.generatedIdentifier}
                        </p>
                      </div>
                      {enrolment.moduleExceptions.some(
                        (exception) =>
                          exception.moduleOfferingId === detail.id &&
                          exception.type === "EXCLUDE",
                      ) ? (
                        <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-800">
                          Excluded
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Attendance">
              <div className="space-y-4">
                {detail.classSessions.length === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-600">
                      No class sessions have been created for this module yet.
                    </p>
                  </div>
                ) : (
                  detail.classSessions.map((classSession) => {
                    const recordByStudent = new Map(
                      classSession.attendanceRecords.map((record) => [
                        record.studentId,
                        record.status,
                      ]),
                    );

                    return (
                      <details
                        key={classSession.id}
                        className="rounded-lg border border-slate-200 bg-white p-4"
                      >
                        <summary className="cursor-pointer font-semibold text-slate-950">
                          {classSession.title} · {classSession.sessionType.name} ·{" "}
                          {formatDateTime(classSession.startsAt)}
                        </summary>
                        <form action={markAttendance} className="mt-4 space-y-4">
                          <input
                            type="hidden"
                            name="moduleOfferingId"
                            value={detail.id}
                          />
                          <input
                            type="hidden"
                            name="classSessionId"
                            value={classSession.id}
                          />
                          <div className="max-h-96 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-200">
                            {detail.courseOffering.enrolments.map((enrolment) => {
                              const excluded = enrolment.moduleExceptions.some(
                                (exception) =>
                                  exception.moduleOfferingId === detail.id &&
                                  exception.type === "EXCLUDE",
                              );

                              if (excluded) {
                                return null;
                              }

                              const currentStatus =
                                recordByStudent.get(enrolment.studentId) ??
                                "PRESENT";

                              return (
                                <div
                                  key={enrolment.id}
                                  className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_180px]"
                                >
                                  <div>
                                    <p className="font-medium text-slate-950">
                                      {enrolment.student.userAccount.fullName}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                      {
                                        enrolment.student.userAccount
                                          .generatedIdentifier
                                      }
                                    </p>
                                  </div>
                                  <select
                                    name={`student_${enrolment.studentId}`}
                                    defaultValue={currentStatus}
                                    className={inputClass()}
                                  >
                                    <option value="PRESENT">Present</option>
                                    <option value="ABSENT">Absent</option>
                                    <option value="LATE">Late</option>
                                    <option value="EXCUSED">Excused</option>
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-slate-600">
                              {classSession.educatorAttendance
                                ? "Educator attendance has been inferred from the submitted register."
                                : "Submitting marks educator attendance for this module session."}
                            </p>
                            <SubmitButton>Save attendance</SubmitButton>
                          </div>
                        </form>
                      </details>
                    );
                  })
                )}
              </div>
            </Section>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">
              No assigned modules
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Assigned module offerings will appear here after an administrator
              creates course offerings.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
