import { describe, it, expect, afterEach } from "vitest";
import { createClassSession } from "./class-sessions";
import { createFaculty, createCourse, createModule, createIntake, createStudyMode } from "./catalogue";
import { createCurriculumTemplate, addAcademicLevel, addTemplateModule } from "./curriculum-template";
import { createCourseOfferingFromTemplate } from "./course-offering";
import { enrollStudent } from "./enrollment";
import { prisma } from "./prisma";
import type { UserRole } from "./generated/prisma/enums";

// ── cleanup tracking ─────────────────────────────────────────────────────────

const createdClassSessionIds: string[] = [];
const createdEnrollmentIds: string[] = [];
const createdCourseOfferingIds: string[] = [];
const createdTemplateIds: string[] = [];
const createdCourseIds: string[] = [];
const createdFacultyIds: string[] = [];
const createdModuleIds: string[] = [];
const createdIntakeIds: string[] = [];
const createdStudyModeIds: string[] = [];
const createdSessionTypeIds: string[] = [];
const createdUserIds: string[] = [];

async function cleanup() {
  if (createdClassSessionIds.length) {
    await prisma.classSession.deleteMany({ where: { id: { in: [...createdClassSessionIds] } } });
    createdClassSessionIds.length = 0;
  }
  if (createdEnrollmentIds.length) {
    await prisma.enrollment.deleteMany({ where: { id: { in: [...createdEnrollmentIds] } } });
    createdEnrollmentIds.length = 0;
  }
  if (createdCourseOfferingIds.length) {
    await prisma.courseOffering.deleteMany({ where: { id: { in: [...createdCourseOfferingIds] } } });
    createdCourseOfferingIds.length = 0;
  }
  if (createdTemplateIds.length) {
    await prisma.curriculumTemplate.deleteMany({ where: { id: { in: [...createdTemplateIds] } } });
    createdTemplateIds.length = 0;
  }
  if (createdCourseIds.length) {
    await prisma.course.deleteMany({ where: { id: { in: [...createdCourseIds] } } });
    createdCourseIds.length = 0;
  }
  if (createdFacultyIds.length) {
    await prisma.faculty.deleteMany({ where: { id: { in: [...createdFacultyIds] } } });
    createdFacultyIds.length = 0;
  }
  if (createdModuleIds.length) {
    await prisma.module.deleteMany({ where: { id: { in: [...createdModuleIds] } } });
    createdModuleIds.length = 0;
  }
  if (createdIntakeIds.length) {
    await prisma.intake.deleteMany({ where: { id: { in: [...createdIntakeIds] } } });
    createdIntakeIds.length = 0;
  }
  if (createdStudyModeIds.length) {
    await prisma.studyMode.deleteMany({ where: { id: { in: [...createdStudyModeIds] } } });
    createdStudyModeIds.length = 0;
  }
  if (createdSessionTypeIds.length) {
    await prisma.sessionType.deleteMany({ where: { id: { in: [...createdSessionTypeIds] } } });
    createdSessionTypeIds.length = 0;
  }
  if (createdUserIds.length) {
    await prisma.auditLogEntry.deleteMany({ where: { actorId: { in: [...createdUserIds] } } });
    await prisma.userAccount.deleteMany({ where: { userId: { in: [...createdUserIds] } } });
    await prisma.account.deleteMany({ where: { userId: { in: [...createdUserIds] } } });
    await prisma.user.deleteMany({ where: { id: { in: [...createdUserIds] } } });
    createdUserIds.length = 0;
  }
}

// ── test helpers ─────────────────────────────────────────────────────────────

let seq = 0;
function uid(prefix: string) {
  return `${prefix}${Date.now()}${++seq}`;
}

async function createTestUserAccount(role: UserRole) {
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
          status: "ACTIVE",
          mustChangePassword: false,
        },
      },
    },
  });
  createdUserIds.push(userId);
  return prisma.userAccount.findUniqueOrThrow({ where: { userId } });
}

async function createSessionType(name = `Lecture ${uid("ST")}`) {
  const st = await prisma.sessionType.create({ data: { name } });
  createdSessionTypeIds.push(st.id);
  return st;
}

async function createOfferingSetup(moduleNames: string[]) {
  const faculty = await createFaculty({ name: `Faculty ${uid("F")}` });
  createdFacultyIds.push(faculty.id);
  const course = await createCourse({
    code: uid("CRS"),
    name: "Software Engineering",
    awardLevel: "DEGREE",
    facultyId: faculty.id,
  });
  createdCourseIds.push(course.id);
  const intake = await createIntake({ name: `Sep ${uid("I")}` });
  createdIntakeIds.push(intake.id);
  const studyMode = await createStudyMode({ name: `Blended ${uid("SM")}` });
  createdStudyModeIds.push(studyMode.id);
  const template = await createCurriculumTemplate(course.id);
  createdTemplateIds.push(template.id);
  const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1 });

  const educator = await createTestUserAccount("EDUCATOR");
  const templateModules = [];
  for (const [index, moduleName] of moduleNames.entries()) {
    const mod = await createModule({ code: uid("MOD"), name: moduleName });
    createdModuleIds.push(mod.id);
    templateModules.push(
      await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: mod.id, credits: 15, sortOrder: index + 1 })
    );
  }

  const offering = await createCourseOfferingFromTemplate({
    curriculumTemplateId: template.id,
    intakeId: intake.id,
    studyModeId: studyMode.id,
    name: `SE ${uid("CO")}`,
    startAt: new Date("2026-09-01T00:00:00.000Z"),
    finishAt: new Date("2027-06-30T00:00:00.000Z"),
    capacity: 24,
    moduleOfferings: templateModules.map((tm) => ({ templateModuleId: tm.id, primaryEducatorId: educator.id })),
  });
  createdCourseOfferingIds.push(offering.id);

  const moduleOfferings = await prisma.moduleOffering.findMany({
    where: { courseOfferingId: offering.id },
    orderBy: { templateModule: { sortOrder: "asc" } },
  });

  return { offering, moduleOfferings, educator };
}

// ── createClassSession ────────────────────────────────────────────────────────

describe("createClassSession", () => {
  afterEach(cleanup);

  it("administrator creates a class session — session persists with no conflicts", async () => {
    const { moduleOfferings } = await createOfferingSetup(["Programming"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const sessionType = await createSessionType();

    const result = await createClassSession({
      moduleOfferingId: moduleOfferings[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      finishAt: new Date("2026-10-01T11:00:00.000Z"),
      createdById: admin.id,
    });

    createdClassSessionIds.push(result.session.id);

    expect(result.session.moduleOfferingId).toBe(moduleOfferings[0].id);
    expect(result.session.sessionTypeId).toBe(sessionType.id);
    expect(result.session.startAt).toEqual(new Date("2026-10-01T09:00:00.000Z"));
    expect(result.session.finishAt).toEqual(new Date("2026-10-01T11:00:00.000Z"));
    expect(result.session.attendanceRequired).toBe(true);
    expect(result.session.sessionLocation).toBeNull();
    expect(result.conflicts).toHaveLength(0);
  });

  it("educator account cannot create a class session", async () => {
    const { moduleOfferings, educator } = await createOfferingSetup(["Programming"]);
    const sessionType = await createSessionType();

    await expect(
      createClassSession({
        moduleOfferingId: moduleOfferings[0].id,
        sessionTypeId: sessionType.id,
        startAt: new Date("2026-10-01T09:00:00.000Z"),
        finishAt: new Date("2026-10-01T11:00:00.000Z"),
        createdById: educator.id,
      })
    ).rejects.toThrow(/administrator/i);
  });

  it("accepts a shared link as session location for an e-learning session", async () => {
    const { moduleOfferings } = await createOfferingSetup(["Programming"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const sessionType = await createSessionType("E-Learning");

    const result = await createClassSession({
      moduleOfferingId: moduleOfferings[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-02T09:00:00.000Z"),
      finishAt: new Date("2026-10-02T10:00:00.000Z"),
      sessionLocation: "https://meet.example.com/room/abc123",
      createdById: admin.id,
    });

    createdClassSessionIds.push(result.session.id);
    expect(result.session.sessionLocation).toBe("https://meet.example.com/room/abc123");
    expect(result.conflicts).toHaveLength(0);
  });

  it("returns an educator conflict warning when the new session overlaps another session for the same educator", async () => {
    // Two separate module offerings — same educator assigned to both.
    const { moduleOfferings: mos1, educator } = await createOfferingSetup(["Programming"]);
    // Second offering reuses the same educator by wiring up the module offering directly.
    const { moduleOfferings: mos2 } = await createOfferingSetup(["Databases"]);
    // Re-assign educator to the second module offering so conflicts can be detected.
    await prisma.moduleOffering.update({
      where: { id: mos2[0].id },
      data: { primaryEducatorId: educator.id },
    });

    const admin = await createTestUserAccount("ADMINISTRATOR");
    const sessionType = await createSessionType();

    // First session: educator teaches Programming 09:00–11:00
    const first = await createClassSession({
      moduleOfferingId: mos1[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-05T09:00:00.000Z"),
      finishAt: new Date("2026-10-05T11:00:00.000Z"),
      createdById: admin.id,
    });
    createdClassSessionIds.push(first.session.id);

    // Second session: same educator's Databases module 10:00–12:00 — overlaps
    const second = await createClassSession({
      moduleOfferingId: mos2[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-05T10:00:00.000Z"),
      finishAt: new Date("2026-10-05T12:00:00.000Z"),
      createdById: admin.id,
    });
    createdClassSessionIds.push(second.session.id);

    expect(second.conflicts).toHaveLength(1);
    expect(second.conflicts[0].type).toBe("educator");
    expect(second.conflicts[0].affectedUserId).toBe(educator.id);
    expect(second.conflicts[0].conflictingSessionId).toBe(first.session.id);
  });

  it("returns a student conflict warning when the new session overlaps a session for a student with effective module access", async () => {
    const { offering: offering1, moduleOfferings: mos1 } = await createOfferingSetup(["Programming"]);
    const { offering: offering2, moduleOfferings: mos2 } = await createOfferingSetup(["Databases"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const sessionType = await createSessionType();

    // Enroll student in both course offerings
    const enroll1 = await enrollStudent({ studentId: student.id, courseOfferingId: offering1.id, enrolledById: admin.id });
    if (enroll1.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll1.enrollment.id);

    const enroll2 = await enrollStudent({ studentId: student.id, courseOfferingId: offering2.id, enrolledById: admin.id });
    if (enroll2.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll2.enrollment.id);

    // Session for Programming 09:00–11:00
    const first = await createClassSession({
      moduleOfferingId: mos1[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-06T09:00:00.000Z"),
      finishAt: new Date("2026-10-06T11:00:00.000Z"),
      createdById: admin.id,
    });
    createdClassSessionIds.push(first.session.id);

    // Session for Databases 10:00–12:00 — overlaps with Programming session
    const second = await createClassSession({
      moduleOfferingId: mos2[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-06T10:00:00.000Z"),
      finishAt: new Date("2026-10-06T12:00:00.000Z"),
      createdById: admin.id,
    });
    createdClassSessionIds.push(second.session.id);

    expect(second.conflicts.some((c) => c.type === "student" && c.affectedUserId === student.id)).toBe(true);
    expect(second.conflicts.find((c) => c.type === "student")?.conflictingSessionId).toBe(first.session.id);
  });
});
