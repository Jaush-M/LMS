import { describe, it, expect, afterEach } from "vitest";
import { getAdministratorDashboard } from "./administrator-dashboard";
import { createFaculty, createCourse, createModule, createIntake, createStudyMode } from "./catalogue";
import { createCurriculumTemplate, addAcademicLevel, addTemplateModule } from "./curriculum-template";
import { createCourseOfferingFromTemplate } from "./course-offering";
import { enrollStudent } from "./enrollment";
import { submitAttendance } from "./attendance";
import { prisma } from "./prisma";
import type { UserRole } from "./generated/prisma/enums";

// ── cleanup tracking ─────────────────────────────────────────────────────────

const createdUserIds: string[] = [];
const createdFacultyIds: string[] = [];
const createdCourseIds: string[] = [];
const createdModuleIds: string[] = [];
const createdIntakeIds: string[] = [];
const createdStudyModeIds: string[] = [];
const createdTemplateIds: string[] = [];
const createdCourseOfferingIds: string[] = [];
const createdEnrollmentIds: string[] = [];
const createdClassSessionIds: string[] = [];
const createdSessionTypeIds: string[] = [];
const createdSystemSettingsIds: string[] = [];
const createdInstitutionEventIds: string[] = [];

async function cleanup() {
  if (createdInstitutionEventIds.length) {
    await prisma.institutionEvent.deleteMany({ where: { id: { in: [...createdInstitutionEventIds] } } });
    createdInstitutionEventIds.length = 0;
  }
  if (createdEnrollmentIds.length) {
    await prisma.enrollment.deleteMany({ where: { id: { in: [...createdEnrollmentIds] } } });
    createdEnrollmentIds.length = 0;
  }
  if (createdCourseOfferingIds.length) {
    await prisma.courseOffering.deleteMany({ where: { id: { in: [...createdCourseOfferingIds] } } });
    createdCourseOfferingIds.length = 0;
  }
  if (createdClassSessionIds.length) {
    await prisma.classSession.deleteMany({ where: { id: { in: [...createdClassSessionIds] } } });
    createdClassSessionIds.length = 0;
  }
  if (createdSessionTypeIds.length) {
    await prisma.sessionType.deleteMany({ where: { id: { in: [...createdSessionTypeIds] } } });
    createdSessionTypeIds.length = 0;
  }
  if (createdTemplateIds.length) {
    await prisma.curriculumTemplate.deleteMany({ where: { id: { in: [...createdTemplateIds] } } });
    createdTemplateIds.length = 0;
  }
  if (createdModuleIds.length) {
    await prisma.module.deleteMany({ where: { id: { in: [...createdModuleIds] } } });
    createdModuleIds.length = 0;
  }
  if (createdCourseIds.length) {
    await prisma.course.deleteMany({ where: { id: { in: [...createdCourseIds] } } });
    createdCourseIds.length = 0;
  }
  if (createdFacultyIds.length) {
    await prisma.faculty.deleteMany({ where: { id: { in: [...createdFacultyIds] } } });
    createdFacultyIds.length = 0;
  }
  if (createdIntakeIds.length) {
    await prisma.intake.deleteMany({ where: { id: { in: [...createdIntakeIds] } } });
    createdIntakeIds.length = 0;
  }
  if (createdStudyModeIds.length) {
    await prisma.studyMode.deleteMany({ where: { id: { in: [...createdStudyModeIds] } } });
    createdStudyModeIds.length = 0;
  }
  if (createdSystemSettingsIds.length) {
    await prisma.systemSettings.deleteMany({ where: { id: { in: [...createdSystemSettingsIds] } } });
    createdSystemSettingsIds.length = 0;
  }
  if (createdUserIds.length) {
    const userAccountIds = (await prisma.userAccount.findMany({ where: { userId: { in: [...createdUserIds] } }, select: { id: true } })).map((u) => u.id);
    await prisma.auditLogEntry.deleteMany({ where: { actorId: { in: userAccountIds } } });
    await prisma.notification.deleteMany({ where: { recipientId: { in: userAccountIds } } });
    await prisma.fileAsset.deleteMany({ where: { uploadedById: { in: userAccountIds } } });
    await prisma.userAccount.deleteMany({ where: { userId: { in: [...createdUserIds] } } });
    await prisma.account.deleteMany({ where: { userId: { in: [...createdUserIds] } } });
    await prisma.user.deleteMany({ where: { id: { in: [...createdUserIds] } } });
    createdUserIds.length = 0;
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

let seq = 0;
function uid(prefix: string) {
  return `${prefix}${Date.now()}${++seq}`;
}

async function createTestUserAccount(role: UserRole, overrides: { status?: "INACTIVE" | "ACTIVE" | "DISABLED" } = {}) {
  const userId = crypto.randomUUID();
  const identifier = uid(`T${role.slice(0, 1)}`);
  const institutionalEmail = `${identifier}@lms.edu.mv`;
  const now = new Date();

  await prisma.user.create({
    data: {
      id: userId,
      name: `${role} ${identifier}`,
      email: institutionalEmail.toLowerCase(),
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
      userAccount: {
        create: {
          role,
          generatedIdentifier: identifier,
          institutionalEmail,
          status: overrides.status ?? "ACTIVE",
          mustChangePassword: false,
        },
      },
    },
  });
  createdUserIds.push(userId);
  return prisma.userAccount.findUniqueOrThrow({ where: { userId } });
}

async function ensureSystemSettings() {
  const existing = await prisma.systemSettings.findFirst();
  if (existing) {
    createdSystemSettingsIds.push(existing.id);
    return existing;
  }
  const settings = await prisma.systemSettings.create({ data: {} });
  createdSystemSettingsIds.push(settings.id);
  return settings;
}

async function createSessionType(name = `Lecture ${uid("ST")}`) {
  const st = await prisma.sessionType.create({ data: { name } });
  createdSessionTypeIds.push(st.id);
  return st;
}

type OfferingSetup = {
  educator: Awaited<ReturnType<typeof createTestUserAccount>>;
  admin: Awaited<ReturnType<typeof createTestUserAccount>>;
  moduleOfferings: { id: string }[];
  courseOfferingId: string;
};

async function createOfferingSetup(moduleNames: string[], educatorOverrides: { status?: "INACTIVE" | "ACTIVE" | "DISABLED" } = {}): Promise<OfferingSetup> {
  const faculty = await createFaculty({ name: `Faculty ${uid("F")}` });
  createdFacultyIds.push(faculty.id);
  const course = await createCourse({ code: uid("CRS"), name: "Software Engineering", awardLevel: "DEGREE", facultyId: faculty.id });
  createdCourseIds.push(course.id);
  const intake = await createIntake({ name: `Sep ${uid("I")}` });
  createdIntakeIds.push(intake.id);
  const studyMode = await createStudyMode({ name: `Blended ${uid("SM")}` });
  createdStudyModeIds.push(studyMode.id);

  await ensureSystemSettings();

  const template = await createCurriculumTemplate(course.id);
  createdTemplateIds.push(template.id);
  const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1 });

  const educator = await createTestUserAccount("EDUCATOR", educatorOverrides);
  const admin = await createTestUserAccount("ADMINISTRATOR");

  const templateModules = [];
  for (const [index, name] of moduleNames.entries()) {
    const mod = await createModule({ code: uid("MOD"), name });
    createdModuleIds.push(mod.id);
    templateModules.push(await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: mod.id, credits: 15, sortOrder: index + 1 }));
  }

  const offering = await createCourseOfferingFromTemplate({
    curriculumTemplateId: template.id,
    intakeId: intake.id,
    studyModeId: studyMode.id,
    name: `SE ${uid("CO")}`,
    startAt: new Date("2026-01-01T00:00:00.000Z"),
    finishAt: new Date("2026-12-31T00:00:00.000Z"),
    capacity: 30,
    moduleOfferings: templateModules.map((tm) => ({ templateModuleId: tm.id, primaryEducatorId: educator.id })),
  });
  createdCourseOfferingIds.push(offering.id);

  await prisma.courseOffering.update({ where: { id: offering.id }, data: { status: "ACTIVE" } });

  const moduleOfferings = await prisma.moduleOffering.findMany({
    where: { courseOfferingId: offering.id },
    orderBy: { templateModule: { sortOrder: "asc" } },
  });

  return { educator, admin, moduleOfferings, courseOfferingId: offering.id };
}

// ── tests ────────────────────────────────────────────────────────────────────

describe("getAdministratorDashboard", () => {
  afterEach(cleanup);

  // ── behavior 1: active course offerings with enrollment counts ───────────

  it("returns active Course Offerings with student enrollment counts", async () => {
    const { admin, courseOfferingId } = await createOfferingSetup(["Programming"]);

    const student1 = await createTestUserAccount("STUDENT");
    const student2 = await createTestUserAccount("STUDENT");
    const r1 = await enrollStudent({ studentId: student1.id, courseOfferingId, enrolledById: admin.id });
    const r2 = await enrollStudent({ studentId: student2.id, courseOfferingId, enrolledById: admin.id });
    if (r1.status !== "enrolled" || r2.status !== "enrolled") throw new Error("Enrollment failed");
    createdEnrollmentIds.push(r1.enrollment.id, r2.enrollment.id);

    const now = new Date("2026-05-20T10:00:00.000Z");
    const data = await getAdministratorDashboard(now);

    const co = data.activeCourseOfferings.find((c) => c.id === courseOfferingId);
    expect(co).toBeDefined();
    expect(co!.enrolmentCount).toBe(2);
    expect(co!.courseName).toBeTruthy();
    expect(co!.name).toBeTruthy();
  });

  // ── behavior 2: upcoming institution events ───────────────────────────────

  it("returns upcoming Institution Events", async () => {
    await ensureSystemSettings();
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const now = new Date("2026-05-20T10:00:00.000Z");

    const future = await prisma.institutionEvent.create({
      data: { title: "Graduation", startAt: new Date("2026-06-01T09:00:00.000Z"), createdById: admin.id },
    });
    createdInstitutionEventIds.push(future.id);

    const past = await prisma.institutionEvent.create({
      data: { title: "Orientation", startAt: new Date("2026-01-15T09:00:00.000Z"), createdById: admin.id },
    });
    createdInstitutionEventIds.push(past.id);

    const data = await getAdministratorDashboard(now);

    const found = data.upcomingEvents.find((e) => e.id === future.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe("Graduation");
    expect(found!.kind).toBe("INSTITUTION");
    const notFound = data.upcomingEvents.find((e) => e.id === past.id);
    expect(notFound).toBeUndefined();
  });

  // ── behavior 3: upcoming course offering events ───────────────────────────

  it("returns upcoming Course Offering Events", async () => {
    const { admin, courseOfferingId } = await createOfferingSetup(["Programming"]);
    const now = new Date("2026-05-20T10:00:00.000Z");

    const event = await prisma.courseOfferingEvent.create({
      data: { title: "Mid-Semester Review", courseOfferingId, startAt: new Date("2026-06-10T09:00:00.000Z"), createdById: admin.id },
    });

    const data = await getAdministratorDashboard(now);

    const found = data.upcomingEvents.find((e) => e.id === event.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe("Mid-Semester Review");
    expect(found!.kind).toBe("COURSE_OFFERING");
    expect(found!.courseOfferingId).toBe(courseOfferingId);
  });

  // ── behavior 4: module offerings with inactive primary educator ───────────

  it("returns Module Offerings whose primary Educator has a non-active account", async () => {
    const { educator, moduleOfferings } = await createOfferingSetup(["Programming"], { status: "DISABLED" });

    const now = new Date("2026-05-20T10:00:00.000Z");
    const data = await getAdministratorDashboard(now);

    const found = data.moduleOfferingsWithoutActiveEducator.find((m) => m.id === moduleOfferings[0].id);
    expect(found).toBeDefined();
    expect(found!.moduleName).toBeTruthy();
    expect(found!.courseOfferingName).toBeTruthy();
    expect(found!.primaryEducatorName).toBeTruthy();
  });

  // ── behavior 5: attendance completion percentage ───────────────────────────

  it("returns attendance completion percentage across active Course Offerings", async () => {
    const { educator, admin, moduleOfferings, courseOfferingId } = await createOfferingSetup(["Programming"]);
    const [mo] = moduleOfferings;
    const sessionType = await createSessionType();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("Enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);
    const now = new Date("2026-05-20T10:00:00.000Z");

    // 2 past sessions, only 1 has attendance submitted
    const s1 = await prisma.classSession.create({
      data: { moduleOfferingId: mo.id, sessionTypeId: sessionType.id, startAt: new Date("2026-05-10T09:00:00.000Z"), finishAt: new Date("2026-05-10T11:00:00.000Z"), attendanceRequired: true, createdById: educator.id },
    });
    createdClassSessionIds.push(s1.id);
    await submitAttendance({ classSessionId: s1.id, educatorId: educator.id, submittedAt: new Date("2026-05-10T10:00:00.000Z"), attendanceEntries: [{ studentId: student.id, status: "PRESENT" }] });

    const s2 = await prisma.classSession.create({
      data: { moduleOfferingId: mo.id, sessionTypeId: sessionType.id, startAt: new Date("2026-05-15T09:00:00.000Z"), finishAt: new Date("2026-05-15T11:00:00.000Z"), attendanceRequired: true, createdById: educator.id },
    });
    createdClassSessionIds.push(s2.id);
    // s2 has no attendance submitted

    const data = await getAdministratorDashboard(now);

    // 1 of 2 sessions have attendance submitted = 50%
    expect(data.attendanceCompletionPercent).toBe(50);
  });
});
