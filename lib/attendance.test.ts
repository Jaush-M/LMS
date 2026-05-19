import { describe, it, expect, afterEach } from "vitest";
import { submitAttendance, getAttendanceForSession, getStudentAttendancePercentage, isAttendanceLocked, requestCorrection, resolveCorrection, adminOverrideAttendance, adminOverrideSessionAttendance, exportAttendanceCSV } from "./attendance";
import { createClassSession } from "./class-sessions";
import { createFaculty, createCourse, createModule, createIntake, createStudyMode } from "./catalogue";
import { createCurriculumTemplate, addAcademicLevel, addTemplateModule } from "./curriculum-template";
import { createCourseOfferingFromTemplate } from "./course-offering";
import { enrollStudent } from "./enrollment";
import { prisma } from "./prisma";
import type { UserRole } from "./generated/prisma/enums";

// ── cleanup tracking ─────────────────────────────────────────────────────────

const createdAttendanceRecordIds: string[] = [];
const createdEducatorAttendanceIds: string[] = [];
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
const createdCorrectionRequestIds: string[] = [];
let createdSystemSettingsId: string | null = null;

async function cleanup() {
  if (createdCorrectionRequestIds.length) {
    await prisma.attendanceCorrectionRequest.deleteMany({ where: { id: { in: [...createdCorrectionRequestIds] } } });
    createdCorrectionRequestIds.length = 0;
  }
  if (createdEducatorAttendanceIds.length) {
    await prisma.educatorAttendanceRecord.deleteMany({ where: { id: { in: [...createdEducatorAttendanceIds] } } });
    createdEducatorAttendanceIds.length = 0;
  }
  if (createdAttendanceRecordIds.length) {
    await prisma.attendanceRecord.deleteMany({ where: { id: { in: [...createdAttendanceRecordIds] } } });
    createdAttendanceRecordIds.length = 0;
  }
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
  if (createdSystemSettingsId) {
    await prisma.systemSettings.deleteMany({ where: { id: createdSystemSettingsId } });
    createdSystemSettingsId = null;
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

  if (!createdSystemSettingsId) {
    const settings = await prisma.systemSettings.create({ data: {} });
    createdSystemSettingsId = settings.id;
  }

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

// ── submitAttendance ─────────────────────────────────────────────────────────

describe("submitAttendance", () => {
  afterEach(cleanup);

  it("educator submits attendance for a subset of students — records created and educator attendance inferred", async () => {
    const { moduleOfferings, educator, offering } = await createOfferingSetup(["Programming"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const sessionType = await createSessionType();
    const student1 = await createTestUserAccount("STUDENT");
    const student2 = await createTestUserAccount("STUDENT");
    const student3 = await createTestUserAccount("STUDENT");

    const enroll1 = await enrollStudent({ studentId: student1.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enroll1.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll1.enrollment.id);

    const enroll2 = await enrollStudent({ studentId: student2.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enroll2.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll2.enrollment.id);

    const enroll3 = await enrollStudent({ studentId: student3.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enroll3.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll3.enrollment.id);

    const sessionResult = await createClassSession({
      moduleOfferingId: moduleOfferings[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      finishAt: new Date("2026-10-01T11:00:00.000Z"),
      createdById: admin.id,
    });
    createdClassSessionIds.push(sessionResult.session.id);

    const submittedAt = new Date("2026-10-01T10:15:00.000Z");

    const result = await submitAttendance({
      classSessionId: sessionResult.session.id,
      educatorId: educator.id,
      submittedAt,
      attendanceEntries: [
        { studentId: student1.id, status: "PRESENT" },
        { studentId: student2.id, status: "ABSENT" },
        { studentId: student3.id, status: "LATE" },
      ],
    });

    for (const record of result.attendanceRecords) {
      createdAttendanceRecordIds.push(record.id);
    }
    createdEducatorAttendanceIds.push(result.educatorAttendance.id);

    expect(result.attendanceRecords).toHaveLength(3);

    const r1 = result.attendanceRecords.find((r) => r.studentId === student1.id)!;
    expect(r1.status).toBe("PRESENT");
    expect(r1.submittedById).toBe(educator.id);
    expect(r1.submittedAt).toEqual(submittedAt);

    const r2 = result.attendanceRecords.find((r) => r.studentId === student2.id)!;
    expect(r2.status).toBe("ABSENT");

    const r3 = result.attendanceRecords.find((r) => r.studentId === student3.id)!;
    expect(r3.status).toBe("LATE");

    expect(result.educatorAttendance.educatorId).toBe(educator.id);
    expect(result.educatorAttendance.classSessionId).toBe(sessionResult.session.id);
    expect(result.educatorAttendance.submittedAttendanceAt).toEqual(submittedAt);
  });

  it("non-educator account cannot submit attendance", async () => {
    const { moduleOfferings, educator, offering } = await createOfferingSetup(["Programming"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const sessionType = await createSessionType();
    const student = await createTestUserAccount("STUDENT");

    const enroll = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enroll.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll.enrollment.id);

    const sessionResult = await createClassSession({
      moduleOfferingId: moduleOfferings[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      finishAt: new Date("2026-10-01T11:00:00.000Z"),
      createdById: admin.id,
    });
    createdClassSessionIds.push(sessionResult.session.id);

    await expect(
      submitAttendance({
        classSessionId: sessionResult.session.id,
        educatorId: student.id,
        submittedAt: new Date("2026-10-01T10:00:00.000Z"),
        attendanceEntries: [{ studentId: student.id, status: "PRESENT" }],
      })
    ).rejects.toThrow(/educator/i);
  });

  it("attendance submission rejects timestamp outside session period", async () => {
    const { moduleOfferings, educator, offering } = await createOfferingSetup(["Programming"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const sessionType = await createSessionType();
    const student = await createTestUserAccount("STUDENT");

    const enroll = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enroll.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll.enrollment.id);

    const sessionResult = await createClassSession({
      moduleOfferingId: moduleOfferings[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      finishAt: new Date("2026-10-01T11:00:00.000Z"),
      createdById: admin.id,
    });
    createdClassSessionIds.push(sessionResult.session.id);

    const beforeSession = new Date("2026-10-01T08:00:00.000Z");

    await expect(
      submitAttendance({
        classSessionId: sessionResult.session.id,
        educatorId: educator.id,
        submittedAt: beforeSession,
        attendanceEntries: [{ studentId: student.id, status: "PRESENT" }],
      })
    ).rejects.toThrow(/session time period/i);
  });

  it("re-submitting attendance updates existing records instead of duplicating", async () => {
    const { moduleOfferings, educator, offering } = await createOfferingSetup(["Programming"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const sessionType = await createSessionType();
    const student = await createTestUserAccount("STUDENT");

    const enroll = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enroll.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll.enrollment.id);

    const sessionResult = await createClassSession({
      moduleOfferingId: moduleOfferings[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      finishAt: new Date("2026-10-01T11:00:00.000Z"),
      createdById: admin.id,
    });
    createdClassSessionIds.push(sessionResult.session.id);

    const firstSubmit = new Date("2026-10-01T10:00:00.000Z");
    const firstResult = await submitAttendance({
      classSessionId: sessionResult.session.id,
      educatorId: educator.id,
      submittedAt: firstSubmit,
      attendanceEntries: [{ studentId: student.id, status: "PRESENT" }],
    });
    for (const record of firstResult.attendanceRecords) {
      createdAttendanceRecordIds.push(record.id);
    }
    createdEducatorAttendanceIds.push(firstResult.educatorAttendance.id);

    const secondSubmit = new Date("2026-10-01T10:30:00.000Z");
    const secondResult = await submitAttendance({
      classSessionId: sessionResult.session.id,
      educatorId: educator.id,
      submittedAt: secondSubmit,
      attendanceEntries: [{ studentId: student.id, status: "ABSENT" }],
    });

    expect(secondResult.attendanceRecords).toHaveLength(1);
    expect(secondResult.attendanceRecords[0].status).toBe("ABSENT");
    expect(secondResult.attendanceRecords[0].submittedAt).toEqual(secondSubmit);
  });
});

// ── getStudentAttendancePercentage ───────────────────────────────────────────

describe("getStudentAttendancePercentage", () => {
  afterEach(cleanup);

  it("calculates 100% when all marked present", async () => {
    const { moduleOfferings, educator, offering } = await createOfferingSetup(["Programming"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const sessionType = await createSessionType();
    const student = await createTestUserAccount("STUDENT");

    const enroll = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enroll.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll.enrollment.id);

    const session1 = await createClassSession({
      moduleOfferingId: moduleOfferings[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      finishAt: new Date("2026-10-01T11:00:00.000Z"),
      createdById: admin.id,
    });
    createdClassSessionIds.push(session1.session.id);

    const session2 = await createClassSession({
      moduleOfferingId: moduleOfferings[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-03T09:00:00.000Z"),
      finishAt: new Date("2026-10-03T11:00:00.000Z"),
      createdById: admin.id,
    });
    createdClassSessionIds.push(session2.session.id);

    const r1 = await submitAttendance({
      classSessionId: session1.session.id,
      educatorId: educator.id,
      submittedAt: new Date("2026-10-01T10:00:00.000Z"),
      attendanceEntries: [{ studentId: student.id, status: "PRESENT" }],
    });
    for (const record of r1.attendanceRecords) createdAttendanceRecordIds.push(record.id);
    createdEducatorAttendanceIds.push(r1.educatorAttendance.id);

    const r2 = await submitAttendance({
      classSessionId: session2.session.id,
      educatorId: educator.id,
      submittedAt: new Date("2026-10-03T10:00:00.000Z"),
      attendanceEntries: [{ studentId: student.id, status: "PRESENT" }],
    });
    for (const record of r2.attendanceRecords) createdAttendanceRecordIds.push(record.id);
    createdEducatorAttendanceIds.push(r2.educatorAttendance.id);

    const pct = await getStudentAttendancePercentage(student.id, moduleOfferings[0].id);
    expect(pct).toBe(100);
  });

  it("late counts as attended in percentage", async () => {
    const { moduleOfferings, educator, offering } = await createOfferingSetup(["Programming"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const sessionType = await createSessionType();
    const student = await createTestUserAccount("STUDENT");

    const enroll = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enroll.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll.enrollment.id);

    const session = await createClassSession({
      moduleOfferingId: moduleOfferings[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      finishAt: new Date("2026-10-01T11:00:00.000Z"),
      createdById: admin.id,
    });
    createdClassSessionIds.push(session.session.id);

    const r = await submitAttendance({
      classSessionId: session.session.id,
      educatorId: educator.id,
      submittedAt: new Date("2026-10-01T10:00:00.000Z"),
      attendanceEntries: [{ studentId: student.id, status: "LATE" }],
    });
    for (const record of r.attendanceRecords) createdAttendanceRecordIds.push(record.id);
    createdEducatorAttendanceIds.push(r.educatorAttendance.id);

    const pct = await getStudentAttendancePercentage(student.id, moduleOfferings[0].id);
    expect(pct).toBe(100);
  });

  it("excused excluded from denominator", async () => {
    const { moduleOfferings, educator, offering } = await createOfferingSetup(["Programming"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const sessionType = await createSessionType();
    const student = await createTestUserAccount("STUDENT");

    const enroll = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enroll.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll.enrollment.id);

    const session1 = await createClassSession({
      moduleOfferingId: moduleOfferings[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      finishAt: new Date("2026-10-01T11:00:00.000Z"),
      createdById: admin.id,
    });
    createdClassSessionIds.push(session1.session.id);

    const session2 = await createClassSession({
      moduleOfferingId: moduleOfferings[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-03T09:00:00.000Z"),
      finishAt: new Date("2026-10-03T11:00:00.000Z"),
      createdById: admin.id,
    });
    createdClassSessionIds.push(session2.session.id);

    const r1 = await submitAttendance({
      classSessionId: session1.session.id,
      educatorId: educator.id,
      submittedAt: new Date("2026-10-01T10:00:00.000Z"),
      attendanceEntries: [{ studentId: student.id, status: "PRESENT" }],
    });
    for (const record of r1.attendanceRecords) createdAttendanceRecordIds.push(record.id);
    createdEducatorAttendanceIds.push(r1.educatorAttendance.id);

    const r2 = await submitAttendance({
      classSessionId: session2.session.id,
      educatorId: educator.id,
      submittedAt: new Date("2026-10-03T10:00:00.000Z"),
      attendanceEntries: [{ studentId: student.id, status: "EXCUSED" }],
    });
    for (const record of r2.attendanceRecords) createdAttendanceRecordIds.push(record.id);
    createdEducatorAttendanceIds.push(r2.educatorAttendance.id);

    const pct = await getStudentAttendancePercentage(student.id, moduleOfferings[0].id);
    expect(pct).toBe(100);
  });

  it("returns null when all records are excused (denominator zero)", async () => {
    const { moduleOfferings, educator, offering } = await createOfferingSetup(["Programming"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const sessionType = await createSessionType();
    const student = await createTestUserAccount("STUDENT");

    const enroll = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enroll.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll.enrollment.id);

    const session = await createClassSession({
      moduleOfferingId: moduleOfferings[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      finishAt: new Date("2026-10-01T11:00:00.000Z"),
      createdById: admin.id,
    });
    createdClassSessionIds.push(session.session.id);

    const r = await submitAttendance({
      classSessionId: session.session.id,
      educatorId: educator.id,
      submittedAt: new Date("2026-10-01T10:00:00.000Z"),
      attendanceEntries: [{ studentId: student.id, status: "EXCUSED" }],
    });
    for (const record of r.attendanceRecords) createdAttendanceRecordIds.push(record.id);
    createdEducatorAttendanceIds.push(r.educatorAttendance.id);

    const pct = await getStudentAttendancePercentage(student.id, moduleOfferings[0].id);
    expect(pct).toBeNull();
  });

  it("correctly mixes present, absent, late, and excused", async () => {
    const { moduleOfferings, educator, offering } = await createOfferingSetup(["Programming"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const sessionType = await createSessionType();
    const student = await createTestUserAccount("STUDENT");

    const enroll = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enroll.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll.enrollment.id);

    const sessions = [
      { date: "2026-10-01", status: "PRESENT" as const },
      { date: "2026-10-03", status: "ABSENT" as const },
      { date: "2026-10-05", status: "LATE" as const },
      { date: "2026-10-07", status: "EXCUSED" as const },
      { date: "2026-10-09", status: "ABSENT" as const },
    ];

    for (const s of sessions) {
      const session = await createClassSession({
        moduleOfferingId: moduleOfferings[0].id,
        sessionTypeId: sessionType.id,
        startAt: new Date(`${s.date}T09:00:00.000Z`),
        finishAt: new Date(`${s.date}T11:00:00.000Z`),
        createdById: admin.id,
      });
      createdClassSessionIds.push(session.session.id);

      const r = await submitAttendance({
        classSessionId: session.session.id,
        educatorId: educator.id,
        submittedAt: new Date(`${s.date}T10:00:00.000Z`),
        attendanceEntries: [{ studentId: student.id, status: s.status }],
      });
      for (const record of r.attendanceRecords) createdAttendanceRecordIds.push(record.id);
      createdEducatorAttendanceIds.push(r.educatorAttendance.id);
    }

    // (present=1 + late=1) / (present=1 + absent=1 + late=1 + absent=1) = 2/4 = 50%
    // excused excluded from denominator
    const pct = await getStudentAttendancePercentage(student.id, moduleOfferings[0].id);
    expect(pct).toBe(50);
  });
});

// ── attendance locking ───────────────────────────────────────────────────────

describe("attendance locking", () => {
  afterEach(cleanup);

  it("attendance is not locked within the correction window", async () => {
    const { moduleOfferings, educator, offering } = await createOfferingSetup(["Programming"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const sessionType = await createSessionType();
    const student = await createTestUserAccount("STUDENT");

    const enroll = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enroll.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll.enrollment.id);

    const session = await createClassSession({
      moduleOfferingId: moduleOfferings[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      finishAt: new Date("2026-10-01T11:00:00.000Z"),
      createdById: admin.id,
    });
    createdClassSessionIds.push(session.session.id);

    const submittedAt = new Date("2026-10-01T10:00:00.000Z");
    const r = await submitAttendance({
      classSessionId: session.session.id,
      educatorId: educator.id,
      submittedAt,
      attendanceEntries: [{ studentId: student.id, status: "PRESENT" }],
    });
    for (const record of r.attendanceRecords) createdAttendanceRecordIds.push(record.id);
    createdEducatorAttendanceIds.push(r.educatorAttendance.id);

    const withinWindow = new Date("2026-10-08T10:00:00.000Z");
    const locked = await isAttendanceLocked(session.session.id, withinWindow);
    expect(locked).toBe(false);
  });

  it("attendance is locked after the 8-day correction window", async () => {
    const { moduleOfferings, educator, offering } = await createOfferingSetup(["Programming"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const sessionType = await createSessionType();
    const student = await createTestUserAccount("STUDENT");

    const enroll = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enroll.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll.enrollment.id);

    const session = await createClassSession({
      moduleOfferingId: moduleOfferings[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      finishAt: new Date("2026-10-01T11:00:00.000Z"),
      createdById: admin.id,
    });
    createdClassSessionIds.push(session.session.id);

    const submittedAt = new Date("2026-10-01T10:00:00.000Z");
    const r = await submitAttendance({
      classSessionId: session.session.id,
      educatorId: educator.id,
      submittedAt,
      attendanceEntries: [{ studentId: student.id, status: "PRESENT" }],
    });
    for (const record of r.attendanceRecords) createdAttendanceRecordIds.push(record.id);
    createdEducatorAttendanceIds.push(r.educatorAttendance.id);

    const afterWindow = new Date("2026-10-09T10:00:00.001Z");
    const locked = await isAttendanceLocked(session.session.id, afterWindow);
    expect(locked).toBe(true);
  });

  it("educator cannot modify attendance after the correction window", async () => {
    const { moduleOfferings, educator, offering } = await createOfferingSetup(["Programming"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const sessionType = await createSessionType();
    const student = await createTestUserAccount("STUDENT");

    const enroll = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enroll.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll.enrollment.id);

    const session = await createClassSession({
      moduleOfferingId: moduleOfferings[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      finishAt: new Date("2026-10-01T11:00:00.000Z"),
      createdById: admin.id,
    });
    createdClassSessionIds.push(session.session.id);

    const submittedAt = new Date("2026-10-01T10:00:00.000Z");
    const firstResult = await submitAttendance({
      classSessionId: session.session.id,
      educatorId: educator.id,
      submittedAt,
      attendanceEntries: [{ studentId: student.id, status: "PRESENT" }],
    });
    for (const record of firstResult.attendanceRecords) createdAttendanceRecordIds.push(record.id);
    createdEducatorAttendanceIds.push(firstResult.educatorAttendance.id);

    const afterWindow = new Date("2026-10-09T10:00:00.001Z");

    await expect(
      submitAttendance({
        classSessionId: session.session.id,
        educatorId: educator.id,
        submittedAt: afterWindow,
        attendanceEntries: [{ studentId: student.id, status: "ABSENT" }],
      })
    ).rejects.toThrow(/locked/i);
  });

  it("locked attendance sets lockedAt on records", async () => {
    const { moduleOfferings, educator, offering } = await createOfferingSetup(["Programming"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const sessionType = await createSessionType();
    const student = await createTestUserAccount("STUDENT");

    const enroll = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enroll.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll.enrollment.id);

    const session = await createClassSession({
      moduleOfferingId: moduleOfferings[0].id,
      sessionTypeId: sessionType.id,
      startAt: new Date("2026-10-01T09:00:00.000Z"),
      finishAt: new Date("2026-10-01T11:00:00.000Z"),
      createdById: admin.id,
    });
    createdClassSessionIds.push(session.session.id);

    const submittedAt = new Date("2026-10-01T10:00:00.000Z");
    const r = await submitAttendance({
      classSessionId: session.session.id,
      educatorId: educator.id,
      submittedAt,
      attendanceEntries: [{ studentId: student.id, status: "PRESENT" }],
    });
    for (const record of r.attendanceRecords) createdAttendanceRecordIds.push(record.id);
    createdEducatorAttendanceIds.push(r.educatorAttendance.id);

    const afterWindow = new Date("2026-10-09T10:00:00.001Z");
    await isAttendanceLocked(session.session.id, afterWindow);

    const records = await prisma.attendanceRecord.findMany({
      where: { classSessionId: session.session.id },
      select: { lockedAt: true },
    });

    expect(records[0].lockedAt).not.toBeNull();
  });
});

// ── correction requests ─────────────────────────────────────────────────────

describe("correction requests", () => {
  afterEach(cleanup);

  function setupLockedSession() {
    return (async () => {
      const { moduleOfferings, educator, offering } = await createOfferingSetup(["Programming"]);
      const admin = await createTestUserAccount("ADMINISTRATOR");
      const sessionType = await createSessionType();
      const student = await createTestUserAccount("STUDENT");

      const enroll = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
      if (enroll.status !== "enrolled") throw new Error("Expected enrolled");
      createdEnrollmentIds.push(enroll.enrollment.id);

      const session = await createClassSession({
        moduleOfferingId: moduleOfferings[0].id,
        sessionTypeId: sessionType.id,
        startAt: new Date("2026-10-01T09:00:00.000Z"),
        finishAt: new Date("2026-10-01T11:00:00.000Z"),
        createdById: admin.id,
      });
      createdClassSessionIds.push(session.session.id);

      const submittedAt = new Date("2026-10-01T10:00:00.000Z");
      const r = await submitAttendance({
        classSessionId: session.session.id,
        educatorId: educator.id,
        submittedAt,
        attendanceEntries: [{ studentId: student.id, status: "PRESENT" }],
      });
      for (const record of r.attendanceRecords) createdAttendanceRecordIds.push(record.id);
      createdEducatorAttendanceIds.push(r.educatorAttendance.id);

      const afterWindow = new Date("2026-10-09T10:00:00.001Z");
      await isAttendanceLocked(session.session.id, afterWindow);

      const attendanceRecord = await prisma.attendanceRecord.findFirstOrThrow({
        where: { classSessionId: session.session.id, studentId: student.id },
      });

      return { moduleOfferings, educator, admin, student, session: session.session, attendanceRecord };
    })();
  }

  it("educator submits correction request for locked attendance", async () => {
    const { educator, student, attendanceRecord } = await setupLockedSession();

    const result = await requestCorrection({
      attendanceRecordId: attendanceRecord.id,
      educatorId: educator.id,
      requestedStatus: "ABSENT",
      reason: "Marked present by mistake",
    });

    createdCorrectionRequestIds.push(result.id);

    expect(result.attendanceRecordId).toBe(attendanceRecord.id);
    expect(result.requestedById).toBe(educator.id);
    expect(result.requestedStatus).toBe("ABSENT");
    expect(result.reason).toBe("Marked present by mistake");
    expect(result.status).toBe("PENDING");
  });

  it("student cannot submit correction request", async () => {
    const { student: studentAccount, attendanceRecord } = await setupLockedSession();

    await expect(
      requestCorrection({
        attendanceRecordId: attendanceRecord.id,
        educatorId: studentAccount.id,
        requestedStatus: "ABSENT",
        reason: "Wrong status",
      })
    ).rejects.toThrow(/educator/i);
  });

  it("administrator approves correction request — attendance updated and audit logged", async () => {
    const { educator, admin, student, attendanceRecord } = await setupLockedSession();

    const correction = await requestCorrection({
      attendanceRecordId: attendanceRecord.id,
      educatorId: educator.id,
      requestedStatus: "ABSENT",
      reason: "Marked present by mistake",
    });
    createdCorrectionRequestIds.push(correction.id);

    const result = await resolveCorrection({
      correctionRequestId: correction.id,
      resolverId: admin.id,
      action: "APPROVE",
    });

    expect(result.status).toBe("APPROVED");

    const updatedRecord = await prisma.attendanceRecord.findUniqueOrThrow({
      where: { id: attendanceRecord.id },
    });
    expect(updatedRecord.status).toBe("ABSENT");

    const auditEntry = await prisma.auditLogEntry.findFirst({
      where: { entityType: "AttendanceRecord", entityId: attendanceRecord.id, action: "CORRECTION_APPROVED" },
    });
    expect(auditEntry).not.toBeNull();
    expect(auditEntry?.actorId).toBe(admin.id);
    expect(auditEntry?.reason).toBe("Marked present by mistake");
  });

  it("administrator rejects correction request — attendance unchanged", async () => {
    const { educator, admin, attendanceRecord } = await setupLockedSession();

    const correction = await requestCorrection({
      attendanceRecordId: attendanceRecord.id,
      educatorId: educator.id,
      requestedStatus: "ABSENT",
      reason: "Marked present by mistake",
    });
    createdCorrectionRequestIds.push(correction.id);

    const result = await resolveCorrection({
      correctionRequestId: correction.id,
      resolverId: admin.id,
      action: "REJECT",
    });

    expect(result.status).toBe("REJECTED");

    const unchangedRecord = await prisma.attendanceRecord.findUniqueOrThrow({
      where: { id: attendanceRecord.id },
    });
    expect(unchangedRecord.status).toBe("PRESENT");
  });

  it("administrator rejecting correction request creates an audit log entry", async () => {
    const { educator, admin, attendanceRecord } = await setupLockedSession();

    const correction = await requestCorrection({
      attendanceRecordId: attendanceRecord.id,
      educatorId: educator.id,
      requestedStatus: "ABSENT",
      reason: "Marked present by mistake",
    });
    createdCorrectionRequestIds.push(correction.id);

    await resolveCorrection({
      correctionRequestId: correction.id,
      resolverId: admin.id,
      action: "REJECT",
    });

    const auditEntry = await prisma.auditLogEntry.findFirst({
      where: { entityType: "AttendanceCorrectionRequest", entityId: correction.id, action: "CORRECTION_REJECTED" },
    });
    expect(auditEntry).not.toBeNull();
    expect(auditEntry?.actorId).toBe(admin.id);
    expect(auditEntry?.reason).toBe("Marked present by mistake");
  });

  it("non-administrator cannot resolve correction request", async () => {
    const { educator, admin, attendanceRecord } = await setupLockedSession();

    const correction = await requestCorrection({
      attendanceRecordId: attendanceRecord.id,
      educatorId: educator.id,
      requestedStatus: "ABSENT",
      reason: "Marked present by mistake",
    });
    createdCorrectionRequestIds.push(correction.id);

    const otherEducator = await createTestUserAccount("EDUCATOR");

    await expect(
      resolveCorrection({
        correctionRequestId: correction.id,
        resolverId: otherEducator.id,
        action: "APPROVE",
      })
    ).rejects.toThrow(/administrator/i);
  });

  it("already resolved correction request cannot be resolved again", async () => {
    const { educator, admin, attendanceRecord } = await setupLockedSession();

    const correction = await requestCorrection({
      attendanceRecordId: attendanceRecord.id,
      educatorId: educator.id,
      requestedStatus: "ABSENT",
      reason: "Marked present by mistake",
    });
    createdCorrectionRequestIds.push(correction.id);

    await resolveCorrection({
      correctionRequestId: correction.id,
      resolverId: admin.id,
      action: "APPROVE",
    });

    await expect(
      resolveCorrection({
        correctionRequestId: correction.id,
        resolverId: admin.id,
        action: "REJECT",
      })
    ).rejects.toThrow(/already resolved/i);
  });
});

// ── admin override ──────────────────────────────────────────────────────────

describe("admin override", () => {
  afterEach(cleanup);

  function setupLockedSession() {
    return (async () => {
      const { moduleOfferings, educator, offering } = await createOfferingSetup(["Programming"]);
      const admin = await createTestUserAccount("ADMINISTRATOR");
      const sessionType = await createSessionType();
      const student = await createTestUserAccount("STUDENT");

      const enroll = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
      if (enroll.status !== "enrolled") throw new Error("Expected enrolled");
      createdEnrollmentIds.push(enroll.enrollment.id);

      const session = await createClassSession({
        moduleOfferingId: moduleOfferings[0].id,
        sessionTypeId: sessionType.id,
        startAt: new Date("2026-10-01T09:00:00.000Z"),
        finishAt: new Date("2026-10-01T11:00:00.000Z"),
        createdById: admin.id,
      });
      createdClassSessionIds.push(session.session.id);

      const submittedAt = new Date("2026-10-01T10:00:00.000Z");
      const r = await submitAttendance({
        classSessionId: session.session.id,
        educatorId: educator.id,
        submittedAt,
        attendanceEntries: [{ studentId: student.id, status: "PRESENT" }],
      });
      for (const record of r.attendanceRecords) createdAttendanceRecordIds.push(record.id);
      createdEducatorAttendanceIds.push(r.educatorAttendance.id);

      const afterWindow = new Date("2026-10-09T10:00:00.001Z");
      await isAttendanceLocked(session.session.id, afterWindow);

      const attendanceRecord = await prisma.attendanceRecord.findFirstOrThrow({
        where: { classSessionId: session.session.id, studentId: student.id },
      });

      return { moduleOfferings, educator, admin, student, session: session.session, attendanceRecord, offering };
    })();
  }

  it("administrator overrides single locked attendance record with reason", async () => {
    const { admin, attendanceRecord } = await setupLockedSession();

    const result = await adminOverrideAttendance({
      attendanceRecordId: attendanceRecord.id,
      newStatus: "ABSENT",
      reason: "Data entry error",
      overriddenById: admin.id,
    });

    expect(result.status).toBe("ABSENT");
    expect(result.overriddenById).toBe(admin.id);
    expect(result.overriddenAt).toBeInstanceOf(Date);
  });

  it("administrator overriding single locked attendance record creates an audit log entry", async () => {
    const { admin, attendanceRecord } = await setupLockedSession();

    const result = await adminOverrideAttendance({
      attendanceRecordId: attendanceRecord.id,
      newStatus: "ABSENT",
      reason: "Data entry error",
      overriddenById: admin.id,
    });

    const auditEntry = await prisma.auditLogEntry.findFirst({
      where: { entityType: "AttendanceRecord", entityId: attendanceRecord.id, action: "ADMIN_OVERRIDE" },
    });
    expect(auditEntry).not.toBeNull();
    expect(auditEntry?.actorId).toBe(admin.id);
    expect(auditEntry?.reason).toBe("Data entry error");
    expect(JSON.parse(auditEntry!.beforeJson!)).toEqual({ status: "PRESENT" });
    expect(JSON.parse(auditEntry!.afterJson!)).toEqual({ status: "ABSENT" });
  });

  it("educator cannot override attendance record", async () => {
    const { educator, attendanceRecord } = await setupLockedSession();

    await expect(
      adminOverrideAttendance({
        attendanceRecordId: attendanceRecord.id,
        newStatus: "ABSENT",
        reason: "Data entry error",
        overriddenById: educator.id,
      })
    ).rejects.toThrow(/administrator/i);
  });

  it("super administrator can override attendance record", async () => {
    const { admin: _admin, attendanceRecord } = await setupLockedSession();
    const superAdmin = await createTestUserAccount("SUPER_ADMINISTRATOR");

    const result = await adminOverrideAttendance({
      attendanceRecordId: attendanceRecord.id,
      newStatus: "EXCUSED",
      reason: "Medical documentation received",
      overriddenById: superAdmin.id,
    });

    expect(result.status).toBe("EXCUSED");
    expect(result.overriddenById).toBe(superAdmin.id);
  });
});

describe("admin override session", () => {
  afterEach(cleanup);

  function setupLockedSessionWithStudents() {
    return (async () => {
      const { moduleOfferings, educator, offering } = await createOfferingSetup(["Programming"]);
      const admin = await createTestUserAccount("ADMINISTRATOR");
      const sessionType = await createSessionType();
      const student1 = await createTestUserAccount("STUDENT");
      const student2 = await createTestUserAccount("STUDENT");
      const student3 = await createTestUserAccount("STUDENT");

      for (const student of [student1, student2, student3]) {
        const enroll = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
        if (enroll.status !== "enrolled") throw new Error("Expected enrolled");
        createdEnrollmentIds.push(enroll.enrollment.id);
      }

      const session = await createClassSession({
        moduleOfferingId: moduleOfferings[0].id,
        sessionTypeId: sessionType.id,
        startAt: new Date("2026-10-01T09:00:00.000Z"),
        finishAt: new Date("2026-10-01T11:00:00.000Z"),
        createdById: admin.id,
      });
      createdClassSessionIds.push(session.session.id);

      const submittedAt = new Date("2026-10-01T10:00:00.000Z");
      const r = await submitAttendance({
        classSessionId: session.session.id,
        educatorId: educator.id,
        submittedAt,
        attendanceEntries: [
          { studentId: student1.id, status: "PRESENT" },
          { studentId: student2.id, status: "ABSENT" },
          { studentId: student3.id, status: "LATE" },
        ],
      });
      for (const record of r.attendanceRecords) createdAttendanceRecordIds.push(record.id);
      createdEducatorAttendanceIds.push(r.educatorAttendance.id);

      const afterWindow = new Date("2026-10-09T10:00:00.001Z");
      await isAttendanceLocked(session.session.id, afterWindow);

      const attendanceRecords = await prisma.attendanceRecord.findMany({
        where: { classSessionId: session.session.id },
        orderBy: { studentId: "asc" },
      });

      return { moduleOfferings, educator, admin, students: [student1, student2, student3], session: session.session, attendanceRecords, offering };
    })();
  }

  it("administrator overrides all attendance records in a locked session", async () => {
    const { admin, students, session, attendanceRecords } = await setupLockedSessionWithStudents();

    const result = await adminOverrideSessionAttendance({
      classSessionId: session.id,
      entries: attendanceRecords.map((r) => ({
        attendanceRecordId: r.id,
        newStatus: "EXCUSED",
      })),
      reason: "Session cancelled retroactively",
      overriddenById: admin.id,
    });

    expect(result.overrides).toHaveLength(3);
    for (const override of result.overrides) {
      expect(override.status).toBe("EXCUSED");
      expect(override.overriddenById).toBe(admin.id);
    }
  });

  it("administrator overriding session creates audit log entries for each record", async () => {
    const { admin, attendanceRecords, session } = await setupLockedSessionWithStudents();

    await adminOverrideSessionAttendance({
      classSessionId: session.id,
      entries: attendanceRecords.map((r) => ({
        attendanceRecordId: r.id,
        newStatus: "EXCUSED",
      })),
      reason: "Session cancelled retroactively",
      overriddenById: admin.id,
    });

    for (const record of attendanceRecords) {
      const auditEntry = await prisma.auditLogEntry.findFirst({
        where: { entityType: "AttendanceRecord", entityId: record.id, action: "ADMIN_OVERRIDE" },
      });
      expect(auditEntry).not.toBeNull();
      expect(auditEntry?.reason).toBe("Session cancelled retroactively");
    }
  });

  it("educator cannot override session attendance", async () => {
    const { educator, attendanceRecords, session } = await setupLockedSessionWithStudents();

    await expect(
      adminOverrideSessionAttendance({
        classSessionId: session.id,
        entries: attendanceRecords.map((r) => ({
          attendanceRecordId: r.id,
          newStatus: "EXCUSED",
        })),
        reason: "Session cancelled retroactively",
        overriddenById: educator.id,
      })
    ).rejects.toThrow(/administrator/i);
  });
});

// ── export attendance CSV ────────────────────────────────────────────────────

describe("exportAttendanceCSV", () => {
  afterEach(cleanup);

  function setupModuleOfferingWithAttendance() {
    return (async () => {
      const { moduleOfferings, educator, offering } = await createOfferingSetup(["Programming"]);
      const admin = await createTestUserAccount("ADMINISTRATOR");
      const sessionType = await createSessionType();
      const student1 = await createTestUserAccount("STUDENT");
      const student2 = await createTestUserAccount("STUDENT");

      for (const student of [student1, student2]) {
        const enroll = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
        if (enroll.status !== "enrolled") throw new Error("Expected enrolled");
        createdEnrollmentIds.push(enroll.enrollment.id);
      }

      const sessions = [];
      for (const day of ["2026-10-01", "2026-10-03", "2026-10-05"]) {
        const session = await createClassSession({
          moduleOfferingId: moduleOfferings[0].id,
          sessionTypeId: sessionType.id,
          startAt: new Date(`${day}T09:00:00.000Z`),
          finishAt: new Date(`${day}T11:00:00.000Z`),
          createdById: admin.id,
        });
        createdClassSessionIds.push(session.session.id);
        sessions.push(session.session);
      }

      await submitAttendance({
        classSessionId: sessions[0].id,
        educatorId: educator.id,
        submittedAt: new Date("2026-10-01T10:00:00.000Z"),
        attendanceEntries: [
          { studentId: student1.id, status: "PRESENT" },
          { studentId: student2.id, status: "PRESENT" },
        ],
      });
      await submitAttendance({
        classSessionId: sessions[1].id,
        educatorId: educator.id,
        submittedAt: new Date("2026-10-03T10:00:00.000Z"),
        attendanceEntries: [
          { studentId: student1.id, status: "LATE" },
          { studentId: student2.id, status: "ABSENT" },
        ],
      });
      await submitAttendance({
        classSessionId: sessions[2].id,
        educatorId: educator.id,
        submittedAt: new Date("2026-10-05T10:00:00.000Z"),
        attendanceEntries: [
          { studentId: student1.id, status: "ABSENT" },
          { studentId: student2.id, status: "EXCUSED" },
        ],
      });

      return { moduleOffering: moduleOfferings[0], educator, admin, students: [student1, student2], sessions, offering };
    })();
  }

  it("CSV contains Student Identifier, Name, per-session status, summary counts, and percentage", async () => {
    const { moduleOffering, educator, students } = await setupModuleOfferingWithAttendance();

    const csv = await exportAttendanceCSV({ moduleOfferingId: moduleOffering.id, requestedById: educator.id });

    const lines = csv.split("\n");
    expect(lines[0]).toContain("Student Identifier");
    expect(lines[0]).toContain("Name");
    expect(lines[0]).toContain("Attendance (%)");
    expect(lines[0]).toContain("Present");
    expect(lines[0]).toContain("Absent");
    expect(lines[0]).toContain("Late");
    expect(lines[0]).toContain("Excused");

    expect(lines).toHaveLength(3);

    const student1Line = lines.find((l) => l.includes(students[0].generatedIdentifier))!;
    expect(student1Line).toContain("67");

    const student2Line = lines.find((l) => l.includes(students[1].generatedIdentifier))!;
    expect(student2Line).toContain("50");
  });

  it("per-session columns show status for each class session", async () => {
    const { moduleOffering, educator, sessions } = await setupModuleOfferingWithAttendance();

    const csv = await exportAttendanceCSV({ moduleOfferingId: moduleOffering.id, requestedById: educator.id });

    const lines = csv.split("\n");
    const header = lines[0];
    for (const session of sessions) {
      expect(header).toContain(session.startAt.toISOString().split("T")[0]);
    }
  });

  it("student excluded from module offering is not in CSV", async () => {
    const { moduleOffering, educator, offering } = await setupModuleOfferingWithAttendance();
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const excludedStudent = await createTestUserAccount("STUDENT");

    const enroll = await enrollStudent({ studentId: excludedStudent.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enroll.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll.enrollment.id);

    await prisma.moduleEnrollmentException.create({
      data: {
        enrollmentId: enroll.enrollment.id,
        moduleOfferingId: moduleOffering.id,
        exceptionType: "EXCLUDE",
        reason: "Excluded from module",
        createdById: admin.id,
      },
    });

    const csv = await exportAttendanceCSV({ moduleOfferingId: moduleOffering.id, requestedById: educator.id });

    const lines = csv.split("\n");
    const dataLines = lines.slice(1).filter((l) => l.trim());
    expect(dataLines.some((l) => l.includes(excludedStudent.generatedIdentifier))).toBe(false);
  });

  it("student cannot export attendance CSV", async () => {
    const { moduleOffering, students } = await setupModuleOfferingWithAttendance();

    await expect(
      exportAttendanceCSV({ moduleOfferingId: moduleOffering.id, requestedById: students[0].id })
    ).rejects.toThrow(/educator or administrator/i);
  });

  it("administrator can export attendance CSV", async () => {
    const { moduleOffering, admin } = await setupModuleOfferingWithAttendance();

    const csv = await exportAttendanceCSV({ moduleOfferingId: moduleOffering.id, requestedById: admin.id });

    const lines = csv.split("\n");
    expect(lines[0]).toContain("Student Identifier");
    expect(lines).toHaveLength(3);
  });
});
