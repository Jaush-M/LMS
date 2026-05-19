import Link from "next/link";

import {
  addTemplateModule,
  createClassSession,
  createCourse,
  createCourseOffering,
  createCurriculumTemplate,
  createModule,
  enrollStudents,
  saveModuleEnrolmentException,
} from "@/app/admin/actions";
import { SignOutButton } from "@/components/sign-out-button";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/session";

export const dynamic = "force-dynamic";

const awardLevels = ["FOUNDATION", "DIPLOMA", "DEGREE", "MASTERS", "PHD"];
const offeringStatuses = ["PLANNED", "ACTIVE"];
const exceptionTypes = ["INCLUDE", "EXCLUDE"];

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

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

function selectClass() {
  return inputClass();
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

function formatDate(date: Date) {
  return date.toLocaleDateString("en-MV", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { account } = await requireRoles(["ADMINISTRATOR", "SUPER_ADMINISTRATOR"]);
  const params = await searchParams;
  const success =
    typeof params?.success === "string" ? params.success : undefined;
  const error = typeof params?.error === "string" ? params.error : undefined;

  const [
    faculties,
    awardingBodies,
    courses,
    modules,
    templates,
    intakes,
    studyModes,
    educators,
    students,
    offerings,
    enrolments,
    sessionTypes,
  ] = await Promise.all([
    prisma.faculty.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.awardingBody.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      where: { status: "ACTIVE" },
      include: { faculty: true },
      orderBy: { name: "asc" },
    }),
    prisma.module.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.curriculumTemplate.findMany({
      include: {
        course: true,
        academicLevels: { orderBy: { sortOrder: "asc" } },
        templateModules: {
          include: {
            module: true,
            academicLevel: true,
            defaultAssessmentComponents: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ course: { name: "asc" } }, { versionLabel: "asc" }],
    }),
    prisma.intake.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.studyMode.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.educatorProfile.findMany({
      where: { userAccount: { status: "ACTIVE" } },
      include: { userAccount: true },
      orderBy: { userAccount: { fullName: "asc" } },
    }),
    prisma.studentProfile.findMany({
      where: { userAccount: { status: "ACTIVE" } },
      include: { userAccount: true },
      orderBy: { userAccount: { generatedIdentifier: "asc" } },
    }),
    prisma.courseOffering.findMany({
      include: {
        course: true,
        intake: true,
        studyMode: true,
        enrolments: {
          where: { status: "ACTIVE" },
          select: { studentId: true },
        },
        moduleOfferings: {
          include: {
            templateModule: {
              include: { module: true, academicLevel: true },
            },
          },
          orderBy: { startsAt: "asc" },
        },
      },
      orderBy: { startsAt: "desc" },
    }),
    prisma.enrolment.findMany({
      where: { status: "ACTIVE" },
      include: {
        student: { include: { userAccount: true } },
        courseOffering: { include: { course: true } },
        moduleExceptions: {
          include: {
            moduleOffering: {
              include: { templateModule: { include: { module: true } } },
            },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
      take: 80,
    }),
    prisma.sessionType.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
  ]);

  const templatesWithModules = templates.filter(
    (template) => template.templateModules.length > 0,
  );

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Academic Administration
            </p>
            <h1 className="text-xl font-semibold text-slate-950">
              {account.fullName}
            </h1>
            <p className="text-sm text-slate-600">
              {account.generatedIdentifier} · {account.role.replaceAll("_", " ")}
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

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <Notice success={success} error={error} />

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-500">Courses</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {courses.length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-500">Templates</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {templates.length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-500">Offerings</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {offerings.length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-500">Students</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {students.length}
            </p>
          </div>
        </div>

        <Section title="Course And Curriculum Setup">
          <div className="grid gap-4 lg:grid-cols-2">
            <form
              action={createCourse}
              className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
            >
              <h3 className="font-semibold text-slate-950">Create Course</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Course code">
                  <input name="code" required className={inputClass()} />
                </Field>
                <Field label="Award level">
                  <select name="awardLevel" required className={selectClass()}>
                    {awardLevels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Course name">
                  <input name="name" required className={inputClass()} />
                </Field>
                <Field label="Faculty">
                  <select name="facultyId" required className={selectClass()}>
                    {faculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Awarding body">
                  <select name="awardingBodyId" className={selectClass()}>
                    <option value="">None</option>
                    {awardingBodies.map((body) => (
                      <option key={body.id} value={body.id}>
                        {body.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <SubmitButton>Create course</SubmitButton>
            </form>

            <form
              action={createModule}
              className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
            >
              <h3 className="font-semibold text-slate-950">Create Module</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Module code">
                  <input name="code" required className={inputClass()} />
                </Field>
                <Field label="Module name">
                  <input name="name" required className={inputClass()} />
                </Field>
              </div>
              <Field label="Description">
                <textarea name="description" rows={3} className={inputClass()} />
              </Field>
              <SubmitButton>Create module</SubmitButton>
            </form>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <form
              action={createCurriculumTemplate}
              className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
            >
              <h3 className="font-semibold text-slate-950">
                Create Curriculum Template
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Course">
                  <select name="courseId" required className={selectClass()}>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Version label">
                  <input
                    name="versionLabel"
                    required
                    placeholder="2026"
                    className={inputClass()}
                  />
                </Field>
              </div>
              <Field label="Academic levels">
                <textarea
                  name="levels"
                  required
                  rows={4}
                  defaultValue={"Level 4|120\nLevel 5|120\nLevel 6|120"}
                  className={inputClass()}
                />
              </Field>
              <SubmitButton>Create template</SubmitButton>
            </form>

            <form
              action={addTemplateModule}
              className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
            >
              <h3 className="font-semibold text-slate-950">
                Add Module To Template
              </h3>
              <Field label="Curriculum template">
                <select
                  name="curriculumTemplateId"
                  required
                  className={selectClass()}
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.course.name} · {template.versionLabel}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Academic level">
                <select name="academicLevelId" required className={selectClass()}>
                  {templates.flatMap((template) =>
                    template.academicLevels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {template.course.name} · {template.versionLabel} ·{" "}
                        {level.label}
                      </option>
                    )),
                  )}
                </select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Module">
                  <select name="moduleId" required className={selectClass()}>
                    {modules.map((moduleRecord) => (
                      <option key={moduleRecord.id} value={moduleRecord.id}>
                        {moduleRecord.code} · {moduleRecord.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Credits">
                  <input
                    name="credits"
                    type="number"
                    min={1}
                    max={120}
                    defaultValue={15}
                    required
                    className={inputClass()}
                  />
                </Field>
                <Field label="Sort order">
                  <input
                    name="sortOrder"
                    type="number"
                    min={1}
                    defaultValue={1}
                    required
                    className={inputClass()}
                  />
                </Field>
              </div>
              <SubmitButton>Add module</SubmitButton>
            </form>
          </div>
        </Section>

        <Section title="Create Course Offering">
          <div className="space-y-4">
            {templatesWithModules.map((template) => (
              <details
                key={template.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <summary className="cursor-pointer font-semibold text-slate-950">
                  {template.course.name} · {template.versionLabel} ·{" "}
                  {template.templateModules.length} module(s)
                </summary>
                <form action={createCourseOffering} className="mt-4 space-y-4">
                  <input type="hidden" name="courseId" value={template.courseId} />
                  <input
                    type="hidden"
                    name="curriculumTemplateId"
                    value={template.id}
                  />
                  <div className="grid gap-3 md:grid-cols-4">
                    <Field label="Offering name">
                      <input
                        name="name"
                        required
                        placeholder={`${template.course.name} January 2026`}
                        className={inputClass()}
                      />
                    </Field>
                    <Field label="Intake">
                      <select name="intakeId" required className={selectClass()}>
                        {intakes.map((intake) => (
                          <option key={intake.id} value={intake.id}>
                            {intake.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Study mode">
                      <select name="studyModeId" required className={selectClass()}>
                        {studyModes.map((mode) => (
                          <option key={mode.id} value={mode.id}>
                            {mode.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Status">
                      <select name="status" required className={selectClass()}>
                        {offeringStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Starts at">
                      <input
                        name="startsAt"
                        type="datetime-local"
                        required
                        className={inputClass()}
                      />
                    </Field>
                    <Field label="Finishes at">
                      <input
                        name="finishesAt"
                        type="datetime-local"
                        required
                        className={inputClass()}
                      />
                    </Field>
                    <Field label="Capacity">
                      <input
                        name="capacity"
                        type="number"
                        min={1}
                        max={24}
                        defaultValue={24}
                        required
                        className={inputClass()}
                      />
                    </Field>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-slate-600">
                        <tr>
                          <th className="px-3 py-2">Level</th>
                          <th className="px-3 py-2">Module</th>
                          <th className="px-3 py-2">Primary educator</th>
                          <th className="px-3 py-2">Module starts</th>
                          <th className="px-3 py-2">Module finishes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {template.templateModules.map((templateModule) => (
                          <tr key={templateModule.id}>
                            <td className="px-3 py-2 text-slate-700">
                              {templateModule.academicLevel.label}
                            </td>
                            <td className="px-3 py-2 font-medium text-slate-950">
                              {templateModule.module.code} ·{" "}
                              {templateModule.module.name}
                            </td>
                            <td className="px-3 py-2">
                              <select
                                name={`educator_${templateModule.id}`}
                                required
                                className={selectClass()}
                              >
                                <option value="">Select educator</option>
                                {educators.map((educator) => (
                                  <option key={educator.id} value={educator.id}>
                                    {educator.userAccount.fullName}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                name={`starts_${templateModule.id}`}
                                type="datetime-local"
                                className={inputClass()}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                name={`finishes_${templateModule.id}`}
                                type="datetime-local"
                                className={inputClass()}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <SubmitButton>Create offering and module chats</SubmitButton>
                </form>
              </details>
            ))}
          </div>
        </Section>

        <Section title="Student Enrolment">
          <div className="space-y-4">
            {offerings.map((offering) => {
              const enrolledStudentIds = new Set(
                offering.enrolments.map((enrolment) => enrolment.studentId),
              );
              const availableStudents = students.filter(
                (student) => !enrolledStudentIds.has(student.id),
              );

              return (
                <details
                  key={offering.id}
                  className="rounded-lg border border-slate-200 bg-white p-4"
                >
                  <summary className="cursor-pointer font-semibold text-slate-950">
                    {offering.name} · {offering.course.name} ·{" "}
                    {offering.enrolments.length}/{offering.capacity} enrolled
                  </summary>
                  <form action={enrollStudents} className="mt-4 space-y-4">
                    <input
                      type="hidden"
                      name="courseOfferingId"
                      value={offering.id}
                    />
                    <div className="grid max-h-72 gap-2 overflow-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-3">
                      {availableStudents.map((student) => (
                        <label
                          key={student.id}
                          className="flex items-center gap-2 text-sm text-slate-700"
                        >
                          <input
                            type="checkbox"
                            name="studentId"
                            value={student.id}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <span>
                            {student.userAccount.generatedIdentifier} ·{" "}
                            {student.userAccount.fullName}
                          </span>
                        </label>
                      ))}
                      {availableStudents.length === 0 ? (
                        <p className="text-sm text-slate-600">
                          Every active student is already enrolled here.
                        </p>
                      ) : null}
                    </div>
                    <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          name="allowCapacityOverride"
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        Allow capacity override
                      </label>
                      <Field label="Override reason">
                        <input name="overrideReason" className={inputClass()} />
                      </Field>
                    </div>
                    <SubmitButton>Enroll selected students</SubmitButton>
                  </form>
                </details>
              );
            })}
          </div>
        </Section>

        <Section title="Class Sessions">
          <form
            action={createClassSession}
            className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Module offering">
                <select name="moduleOfferingId" required className={selectClass()}>
                  {offerings.flatMap((offering) =>
                    offering.moduleOfferings.map((moduleOffering) => (
                      <option key={moduleOffering.id} value={moduleOffering.id}>
                        {offering.name} ·{" "}
                        {moduleOffering.templateModule.module.name}
                      </option>
                    )),
                  )}
                </select>
              </Field>
              <Field label="Session type">
                <select name="sessionTypeId" required className={selectClass()}>
                  {sessionTypes.map((sessionType) => (
                    <option key={sessionType.id} value={sessionType.id}>
                      {sessionType.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Title">
                <input
                  name="title"
                  required
                  placeholder="Week 2 Lecture"
                  className={inputClass()}
                />
              </Field>
              <Field label="Location">
                <input
                  name="location"
                  placeholder="Room A-101 or meeting URL"
                  className={inputClass()}
                />
              </Field>
              <Field label="Starts at">
                <input
                  name="startsAt"
                  type="datetime-local"
                  required
                  className={inputClass()}
                />
              </Field>
              <Field label="Ends at">
                <input
                  name="endsAt"
                  type="datetime-local"
                  required
                  className={inputClass()}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                name="isAttendanceRequired"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300"
              />
              Attendance required
            </label>
            <SubmitButton>Create class session</SubmitButton>
          </form>
        </Section>

        <Section title="Module Enrolment Exceptions">
          <form
            action={saveModuleEnrolmentException}
            className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Enrolment">
                <select name="enrolmentId" required className={selectClass()}>
                  {enrolments.map((enrolment) => (
                    <option key={enrolment.id} value={enrolment.id}>
                      {enrolment.student.userAccount.generatedIdentifier} ·{" "}
                      {enrolment.student.userAccount.fullName} ·{" "}
                      {enrolment.courseOffering.course.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Module offering">
                <select name="moduleOfferingId" required className={selectClass()}>
                  {offerings.flatMap((offering) =>
                    offering.moduleOfferings.map((moduleOffering) => (
                      <option key={moduleOffering.id} value={moduleOffering.id}>
                        {offering.name} ·{" "}
                        {moduleOffering.templateModule.module.name}
                      </option>
                    )),
                  )}
                </select>
              </Field>
              <Field label="Exception type">
                <select name="type" required className={selectClass()}>
                  {exceptionTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Reason">
                <input name="reason" required className={inputClass()} />
              </Field>
            </div>
            <SubmitButton>Save module exception</SubmitButton>
          </form>

          <div className="rounded-lg border border-slate-200 bg-white">
            {enrolments.length === 0 ? (
              <p className="p-4 text-sm text-slate-600">
                No active enrolments yet.
              </p>
            ) : (
              enrolments.map((enrolment) => (
                <div
                  key={enrolment.id}
                  className="border-b border-slate-100 p-4 last:border-b-0"
                >
                  <p className="font-medium text-slate-950">
                    {enrolment.student.userAccount.fullName}
                  </p>
                  <p className="text-sm text-slate-600">
                    {enrolment.courseOffering.course.name} · enrolled{" "}
                    {formatDate(enrolment.enrolledAt)}
                  </p>
                  {enrolment.moduleExceptions.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {enrolment.moduleExceptions.map((exception) => (
                        <span
                          key={exception.id}
                          className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                        >
                          {exception.type} ·{" "}
                          {exception.moduleOffering.templateModule.module.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </Section>

        <Section title="Current Offerings">
          <div className="grid gap-4 lg:grid-cols-2">
            {offerings.map((offering) => (
              <div
                key={offering.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-950">
                      {offering.name}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {offering.course.name} · {offering.intake.name} ·{" "}
                      {offering.studyMode.name}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                    {offering.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {formatDate(offering.startsAt)} to{" "}
                  {formatDate(offering.finishesAt)}
                </p>
                <div className="mt-3 grid gap-2">
                  {offering.moduleOfferings.map((moduleOffering) => (
                    <div
                      key={moduleOffering.id}
                      className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                    >
                      {moduleOffering.templateModule.academicLevel.label} ·{" "}
                      {moduleOffering.templateModule.module.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}
