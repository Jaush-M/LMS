import { describe, it, expect, afterEach } from "vitest";
import { getEducatorDashboard } from "./educator-dashboard";
import { createFaculty, createCourse, createModule, createIntake, createStudyMode } from "./catalogue";
import { createCurriculumTemplate, addAcademicLevel, addTemplateModule } from "./curriculum-template";
import { createCourseOfferingFromTemplate } from "./course-offering";
import { enrollStudent } from "./enrollment";
import { submitAttendance } from "./attendance";
import { createAssignment, publishAssignment } from "./assignments";
import { createAssessmentComponent, upsertComponentMark, releaseComponentMark, releaseFinalGrades } from "./assessment";
import { sendChatMessage } from "./group-chat";
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

async function cleanup() {
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

async function ensureSystemSettings(overrides: Partial<{ passThresholdPercent: number; attendanceRiskThresholdPercent: number; defaultReminderPeriodDays: number }> = {}) {
  const existing = await prisma.systemSettings.findFirst();
  if (existing) {
    createdSystemSettingsIds.push(existing.id);
    return existing;
  }
  const settings = await prisma.systemSettings.create({ data: overrides });
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

async function createOfferingSetup(moduleNames: string[]): Promise<OfferingSetup> {
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

  const educator = await createTestUserAccount("EDUCATOR");
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

  const moduleOfferings = await prisma.moduleOffering.findMany({
    where: { courseOfferingId: offering.id },
    orderBy: { templateModule: { sortOrder: "asc" } },
  });

  return { educator, admin, moduleOfferings, courseOfferingId: offering.id };
}

async function enrollTestStudent(courseOfferingId: string, adminId: string) {
  const student = await createTestUserAccount("STUDENT");
  const result = await enrollStudent({ studentId: student.id, courseOfferingId, enrolledById: adminId });
  if (result.status !== "enrolled") throw new Error("Enrollment failed in test setup");
  createdEnrollmentIds.push(result.enrollment.id);
  return student;
}

// ── tests ────────────────────────────────────────────────────────────────────

describe("getEducatorDashboard", () => {
  afterEach(cleanup);

  // ── behavior 1: empty state ────────────────────────────────────────────────

  it("educator with no assigned module offerings returns empty dashboard", async () => {
    await ensureSystemSettings();
    const educator = await createTestUserAccount("EDUCATOR");

    const data = await getEducatorDashboard(educator.id);

    expect(data.assignedModuleOfferings).toEqual([]);
    expect(data.pendingMarking).toEqual([]);
    expect(data.upcomingClassSessions).toEqual([]);
    expect(data.unsubmittedAttendanceSessions).toEqual([]);
    expect(data.unreadMentions).toEqual([]);
    expect(data.atRiskStudents).toEqual([]);
  });

  // ── behavior 2: assigned module offerings ─────────────────────────────────

  it("returns assigned module offerings with module name and course offering name", async () => {
    const { educator, moduleOfferings, courseOfferingId } = await createOfferingSetup(["Programming", "Databases"]);

    const data = await getEducatorDashboard(educator.id);

    expect(data.assignedModuleOfferings).toHaveLength(2);
    const ids = data.assignedModuleOfferings.map((m) => m.id);
    expect(ids).toContain(moduleOfferings[0].id);
    expect(ids).toContain(moduleOfferings[1].id);
    for (const m of data.assignedModuleOfferings) {
      expect(m.courseOfferingId).toBe(courseOfferingId);
      expect(m.courseOfferingName).toBeTruthy();
      expect(m.moduleName).toBeTruthy();
    }
  });

  // ── behavior 3: pending marking ───────────────────────────────────────────

  it("returns Pending Marking for submissions not yet marked", async () => {
    const { educator, admin, moduleOfferings, courseOfferingId } = await createOfferingSetup(["Programming"]);
    const [mo] = moduleOfferings;
    const student = await enrollTestStudent(courseOfferingId, admin.id);
    const now = new Date("2026-05-20T10:00:00.000Z");

    const assignment = await createAssignment({
      moduleOfferingId: mo.id,
      createdById: educator.id,
      title: "Coursework 1",
      body: "body",
      deadline: new Date("2026-05-01T23:59:00.000Z"),
      maximumMark: 100,
    });
    await publishAssignment({ id: assignment.id, publishedById: educator.id });

    // Simulate a late submission directly (past deadline)
    const fileAsset = await prisma.fileAsset.create({
      data: { originalFilename: "sub.pdf", mimeType: "application/pdf", sizeBytes: 1000, storageKey: uid("file"), storageDriver: "local", category: "SUBMISSION", uploadedById: student.id },
    });
    await prisma.assignmentSubmission.create({
      data: { assignmentId: assignment.id, studentId: student.id, fileAssetId: fileAsset.id, status: "LATE", submittedAt: new Date("2026-05-02T01:00:00.000Z") },
    });

    const data = await getEducatorDashboard(educator.id, now);

    expect(data.pendingMarking).toHaveLength(1);
    expect(data.pendingMarking[0].assignmentId).toBe(assignment.id);
    expect(data.pendingMarking[0].assignmentTitle).toBe("Coursework 1");
    expect(data.pendingMarking[0].moduleOfferingId).toBe(mo.id);
    expect(data.pendingMarking[0].studentId).toBe(student.id);
  });

  // ── behavior 4: upcoming class sessions ───────────────────────────────────

  it("returns upcoming Class Sessions sorted by nearest first", async () => {
    const { educator, moduleOfferings } = await createOfferingSetup(["Programming"]);
    const [mo] = moduleOfferings;
    const sessionType = await createSessionType();
    const now = new Date("2026-05-20T10:00:00.000Z");

    const s1 = await prisma.classSession.create({
      data: { moduleOfferingId: mo.id, sessionTypeId: sessionType.id, startAt: new Date("2026-05-25T09:00:00.000Z"), finishAt: new Date("2026-05-25T11:00:00.000Z"), createdById: educator.id },
    });
    const s2 = await prisma.classSession.create({
      data: { moduleOfferingId: mo.id, sessionTypeId: sessionType.id, startAt: new Date("2026-05-22T09:00:00.000Z"), finishAt: new Date("2026-05-22T11:00:00.000Z"), createdById: educator.id },
    });
    createdClassSessionIds.push(s1.id, s2.id);

    const data = await getEducatorDashboard(educator.id, now);

    expect(data.upcomingClassSessions).toHaveLength(2);
    expect(data.upcomingClassSessions[0].id).toBe(s2.id);
    expect(data.upcomingClassSessions[1].id).toBe(s1.id);
    expect(data.upcomingClassSessions[0].moduleName).toBeTruthy();
    expect(data.upcomingClassSessions[0].sessionTypeName).toBeTruthy();
  });

  // ── behavior 5: class sessions with no attendance submitted ───────────────

  it("returns past Class Sessions with attendanceRequired=true and no attendance submitted", async () => {
    const { educator, admin, moduleOfferings, courseOfferingId } = await createOfferingSetup(["Programming"]);
    const [mo] = moduleOfferings;
    const sessionType = await createSessionType();
    const student = await enrollTestStudent(courseOfferingId, admin.id);
    const now = new Date("2026-05-20T10:00:00.000Z");

    // Past session with no attendance submitted
    const unsubmitted = await prisma.classSession.create({
      data: { moduleOfferingId: mo.id, sessionTypeId: sessionType.id, startAt: new Date("2026-05-15T09:00:00.000Z"), finishAt: new Date("2026-05-15T11:00:00.000Z"), attendanceRequired: true, createdById: educator.id },
    });
    createdClassSessionIds.push(unsubmitted.id);

    // Past session with attendance submitted
    const submitted = await prisma.classSession.create({
      data: { moduleOfferingId: mo.id, sessionTypeId: sessionType.id, startAt: new Date("2026-05-10T09:00:00.000Z"), finishAt: new Date("2026-05-10T11:00:00.000Z"), attendanceRequired: true, createdById: educator.id },
    });
    createdClassSessionIds.push(submitted.id);
    await submitAttendance({ classSessionId: submitted.id, educatorId: educator.id, submittedAt: new Date("2026-05-10T10:00:00.000Z"), attendanceEntries: [{ studentId: student.id, status: "PRESENT" }] });

    const data = await getEducatorDashboard(educator.id, now);

    expect(data.unsubmittedAttendanceSessions).toHaveLength(1);
    expect(data.unsubmittedAttendanceSessions[0].id).toBe(unsubmitted.id);
    expect(data.unsubmittedAttendanceSessions[0].moduleName).toBeTruthy();
  });

  // ── behavior 6: unread @mentions ──────────────────────────────────────────

  it("returns unread @mentions from Module Group Chats", async () => {
    const { educator, admin, moduleOfferings, courseOfferingId } = await createOfferingSetup(["Programming"]);
    const [mo] = moduleOfferings;
    const student = await enrollTestStudent(courseOfferingId, admin.id);
    const now = new Date("2026-05-20T10:00:00.000Z");

    const chat = await prisma.moduleGroupChat.findUniqueOrThrow({ where: { moduleOfferingId: mo.id } });
    const educatorIdentifier = educator.generatedIdentifier;

    // Student mentions the educator
    await sendChatMessage({ chatId: chat.id, senderId: student.id, body: `Hey @${educatorIdentifier} please check this` });

    const data = await getEducatorDashboard(educator.id, now);

    expect(data.unreadMentions).toHaveLength(1);
    expect(data.unreadMentions[0].moduleOfferingId).toBe(mo.id);
    expect(data.unreadMentions[0].moduleName).toBeTruthy();
  });

  // ── behavior 7: at-risk students — low attendance ─────────────────────────

  it("includes students with Attendance Percentage below the Attendance Risk Threshold in atRiskStudents", async () => {
    const { educator, admin, moduleOfferings, courseOfferingId } = await createOfferingSetup(["Programming"]);
    const [mo] = moduleOfferings;
    const sessionType = await createSessionType();
    const student = await enrollTestStudent(courseOfferingId, admin.id);
    const now = new Date("2026-05-20T10:00:00.000Z");

    // Create 5 sessions, student absent for all
    for (let i = 1; i <= 5; i++) {
      const session = await prisma.classSession.create({
        data: { moduleOfferingId: mo.id, sessionTypeId: sessionType.id, startAt: new Date(`2026-05-0${i}T09:00:00.000Z`), finishAt: new Date(`2026-05-0${i}T11:00:00.000Z`), attendanceRequired: true, createdById: educator.id },
      });
      createdClassSessionIds.push(session.id);
      await submitAttendance({ classSessionId: session.id, educatorId: educator.id, submittedAt: new Date(`2026-05-0${i}T09:30:00.000Z`), attendanceEntries: [{ studentId: student.id, status: "ABSENT" }] });
    }

    const data = await getEducatorDashboard(educator.id, now);

    const atRisk = data.atRiskStudents.find((s) => s.studentId === student.id && s.moduleOfferingId === mo.id);
    expect(atRisk).toBeDefined();
    const lowAttReason = atRisk?.reasons.find((r) => r.kind === "LOW_ATTENDANCE");
    expect(lowAttReason).toBeDefined();
  });

  // ── behavior 8: at-risk students — overdue assignment without submission ───

  it("includes students with overdue assignment without submission in atRiskStudents", async () => {
    const { educator, admin, moduleOfferings, courseOfferingId } = await createOfferingSetup(["Programming"]);
    const [mo] = moduleOfferings;
    const student = await enrollTestStudent(courseOfferingId, admin.id);
    const now = new Date("2026-05-20T10:00:00.000Z");

    const assignment = await createAssignment({
      moduleOfferingId: mo.id,
      createdById: educator.id,
      title: "Overdue",
      body: "body",
      deadline: new Date("2026-05-01T23:59:00.000Z"),
      maximumMark: 100,
    });
    await publishAssignment({ id: assignment.id, publishedById: educator.id });

    const data = await getEducatorDashboard(educator.id, now);

    const atRisk = data.atRiskStudents.find((s) => s.studentId === student.id && s.moduleOfferingId === mo.id);
    expect(atRisk).toBeDefined();
    const overdueReason = atRisk?.reasons.find((r) => r.kind === "OVERDUE_ASSIGNMENT");
    expect(overdueReason).toBeDefined();
    if (overdueReason?.kind === "OVERDUE_ASSIGNMENT") {
      expect(overdueReason.assignmentId).toBe(assignment.id);
    }
  });

  // ── behavior 9: at-risk students — released final grade below pass threshold

  it("includes students with Released Final Grade below Pass Threshold in atRiskStudents", async () => {
    const { educator, admin, moduleOfferings, courseOfferingId } = await createOfferingSetup(["Programming"]);
    const [mo] = moduleOfferings;
    const student = await enrollTestStudent(courseOfferingId, admin.id);
    const now = new Date("2026-05-20T10:00:00.000Z");

    const component = await createAssessmentComponent({
      moduleOfferingId: mo.id,
      createdById: admin.id,
      title: "Final",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 100,
      maximumMark: 100,
      sortOrder: 1,
    });
    await upsertComponentMark({ assessmentComponentId: component.id, studentId: student.id, score: 40, markedById: educator.id });
    await releaseComponentMark({ componentMarkId: (await prisma.componentMark.findFirstOrThrow({ where: { assessmentComponentId: component.id, studentId: student.id } })).id, releasedById: educator.id });
    await releaseFinalGrades({ moduleOfferingId: mo.id, releasedById: educator.id });

    const data = await getEducatorDashboard(educator.id, now);

    const atRisk = data.atRiskStudents.find((s) => s.studentId === student.id && s.moduleOfferingId === mo.id);
    expect(atRisk).toBeDefined();
    const failedReason = atRisk?.reasons.find((r) => r.kind === "FAILED_FINAL_GRADE");
    expect(failedReason).toBeDefined();
    if (failedReason?.kind === "FAILED_FINAL_GRADE") {
      expect(failedReason.percentage).toBe(40);
    }
  });
});
