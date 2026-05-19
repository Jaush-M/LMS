import {
  getAdminDashboard,
  getEducatorDashboard,
  getStudentDashboard,
  getSuperAdminDashboard,
} from "@/lib/dashboard";
import { requireCurrentUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-600">{hint}</p> : null}
    </div>
  );
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

export default async function DashboardPage() {
  const { account } = await requireCurrentUser();

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              {account.role.replaceAll("_", " ")}
            </p>
            <h1 className="text-xl font-semibold text-slate-950">
              {account.fullName}
            </h1>
            <p className="text-sm text-slate-600">
              {account.generatedIdentifier} · {account.institutionalEmail}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {account.role === "STUDENT" ? (
              <Link
                href="/student"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Learning
              </Link>
            ) : null}
            {account.role === "EDUCATOR" ? (
              <Link
                href="/educator"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Modules
              </Link>
            ) : null}
            {account.role === "ADMINISTRATOR" ||
            account.role === "SUPER_ADMINISTRATOR" ? (
              <Link
                href="/admin"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Admin
              </Link>
            ) : null}
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {account.role === "STUDENT" && account.studentProfile ? (
          <StudentDashboard studentId={account.studentProfile.id} />
        ) : null}
        {account.role === "EDUCATOR" && account.educatorProfile ? (
          <EducatorDashboard educatorId={account.educatorProfile.id} />
        ) : null}
        {account.role === "ADMINISTRATOR" ? <AdminDashboard /> : null}
        {account.role === "SUPER_ADMINISTRATOR" ? (
          <SuperAdminDashboard />
        ) : null}
      </div>
    </main>
  );
}

async function StudentDashboard({ studentId }: { studentId: string }) {
  const data = await getStudentDashboard(studentId);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active enrolments" value={data.enrolments.length} />
        <StatCard
          label="Attendance"
          value={
            data.attendancePercentage === null
              ? "No data"
              : `${data.attendancePercentage}%`
          }
          hint={
            data.attendancePercentage !== null && data.attendancePercentage < 80
              ? "Attendance below target"
              : "Across submitted sessions"
          }
        />
        <StatCard label="Due assignments" value={data.dueAssignments.length} />
        <StatCard label="Unread notifications" value={data.notifications.length} />
      </div>
      <Section title="Due Assignments">
        <div className="grid gap-3 lg:grid-cols-2">
          {data.dueAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <p className="font-medium text-slate-950">{assignment.title}</p>
              <p className="text-sm text-slate-600">
                {assignment.moduleOffering.templateModule.module.name}
              </p>
              <p className="mt-2 text-sm text-emerald-700">
                Due {assignment.deadlineAt.toLocaleString("en-MV")}
              </p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Latest Released Marks">
        <div className="grid gap-3 lg:grid-cols-3">
          {data.marks.map((mark) => (
            <div
              key={mark.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <p className="font-medium text-slate-950">
                {mark.assessmentComponent.title}
              </p>
              <p className="text-sm text-slate-600">Mark: {String(mark.mark)}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

async function EducatorDashboard({ educatorId }: { educatorId: string }) {
  const data = await getEducatorDashboard(educatorId);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Assigned modules" value={data.moduleOfferings.length} />
        <StatCard label="Pending submissions" value={data.pendingSubmissions} />
        <StatCard label="Mentions" value={data.mentions.length} />
      </div>
      <Section title="Assigned Module Offerings">
        <div className="grid gap-3 lg:grid-cols-2">
          {data.moduleOfferings.map((offering) => (
            <div
              key={offering.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <p className="font-medium text-slate-950">
                {offering.templateModule.module.name}
              </p>
              <p className="text-sm text-slate-600">
                {offering.courseOffering.course.name} ·{" "}
                {offering.templateModule.academicLevel.label}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

async function AdminDashboard() {
  const data = await getAdminDashboard();

  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active offerings" value={data.activeCourseOfferings} />
        <StatCard label="Students" value={data.students} />
        <StatCard label="Educators" value={data.educators} />
        <StatCard label="Correction requests" value={data.pendingCorrections} />
      </div>
      <Section title="Operational Audit">
        <div className="rounded-lg border border-slate-200 bg-white">
          {data.operationalAuditEvents.length === 0 ? (
            <p className="p-4 text-sm text-slate-600">
              No operational audit events yet.
            </p>
          ) : (
            data.operationalAuditEvents.map((event) => (
              <div key={event.id} className="border-b border-slate-100 p-4">
                <p className="font-medium text-slate-950">{event.action}</p>
                <p className="text-sm text-slate-600">
                  {event.entityType} · {event.createdAt.toLocaleString("en-MV")}
                </p>
              </div>
            ))
          )}
        </div>
      </Section>
    </>
  );
}

async function SuperAdminDashboard() {
  const data = await getSuperAdminDashboard();

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="User accounts" value={data.userAccounts} />
        <StatCard label="Administrators" value={data.admins} />
        <StatCard label="System settings" value={data.settings.length} />
      </div>
      <Section title="System Settings">
        <div className="grid gap-3 lg:grid-cols-2">
          {data.settings.map((setting) => (
            <div
              key={setting.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <p className="font-medium text-slate-950">{setting.key}</p>
              <p className="mt-2 break-words text-sm text-slate-600">
                {JSON.stringify(setting.valueJson)}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
