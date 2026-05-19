import { describe, it, expect, afterEach } from "vitest";
import { getStudentDashboard } from "./student-dashboard";
import { createFaculty, createCourse, createModule, createIntake, createStudyMode } from "./catalogue";
import { createCurriculumTemplate, addAcademicLevel, addTemplateModule } from "./curriculum-template";
import { createCourseOfferingFromTemplate } from "./course-offering";
import { enrollStudent } from "./enrollment";
import { submitAttendance } from "./attendance";
import { createClassSession } from "./class-sessions";
import { createAssignment, publishAssignment, submitAssignment } from "./assignments";
import { createAssessmentComponent, upsertComponentMark, releaseComponentMark, releaseFinalGrades } from "./assessment";
import { sendChatMessage, markChatSeen } from "./group-chat";
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
    await prisma.auditLogEntry.deleteMany({ where: { actorId: { in: [...createdUserIds] } } });
    await prisma.notification.deleteMany({ where: { recipientId: { in: [...createdUserIds] } } });
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

async function createTestUserAccount(role: UserRole, overrides: { reminderPeriodDays?: number } = {}) {
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
          ...overrides,
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
  student: Awaited<ReturnType<typeof createTestUserAccount>>;
  educator: Awaited<ReturnType<typeof createTestUserAccount>>;
  admin: Awaited<ReturnType<typeof createTestUserAccount>>;
  moduleOfferings: { id: string; moduleOfferingId?: string }[];
  courseOfferingId: string;
  enrollmentId: string;
  academicLevelId: string;
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

  const student = await createTestUserAccount("STUDENT");
  const enrollResult = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
  if (enrollResult.status !== "enrolled") throw new Error("Enrollment failed in test setup");
  createdEnrollmentIds.push(enrollResult.enrollment.id);

  return { student, educator, admin, moduleOfferings, courseOfferingId: offering.id, enrollmentId: enrollResult.enrollment.id, academicLevelId: level.id };
}

// ── tests ────────────────────────────────────────────────────────────────────

describe("getStudentDashboard", () => {
  afterEach(cleanup);

  // ── behavior 1: empty state ────────────────────────────────────────────────

  it("student with no enrollments returns empty dashboard", async () => {
    await ensureSystemSettings();
    const student = await createTestUserAccount("STUDENT");

    const data = await getStudentDashboard(student.id);

    expect(data.dueAssignments).toEqual([]);
    expect(data.attendanceByModuleOffering).toEqual([]);
    expect(data.releasedMarks).toEqual([]);
    expect(data.releasedFinalGrades).toEqual([]);
    expect(data.chatActivity).toEqual([]);
    expect(data.upcomingCalendarEvents).toHaveLength(0);
    expect(data.courseProgress).toEqual([]);
    expect(data.attentionItems).toEqual([]);
  });

  // ── behavior 2: due assignments sorted by nearest deadline ─────────────────

  it("returns published assignments sorted by nearest deadline", async () => {
    const { student, educator, moduleOfferings } = await createOfferingSetup(["Programming", "Databases"]);
    const [mo1, mo2] = moduleOfferings;
    const now = new Date("2026-05-20T10:00:00.000Z");

    const a1 = await createAssignment({ moduleOfferingId: mo1.id, createdById: educator.id, title: "Assignment A", body: "body", deadline: new Date("2026-05-25T23:59:00.000Z"), maximumMark: 100 });
    const a2 = await createAssignment({ moduleOfferingId: mo2.id, createdById: educator.id, title: "Assignment B", body: "body", deadline: new Date("2026-05-22T23:59:00.000Z"), maximumMark: 100 });
    await publishAssignment({ id: a1.id, publishedById: educator.id });
    await publishAssignment({ id: a2.id, publishedById: educator.id });

    const data = await getStudentDashboard(student.id, now);

    expect(data.dueAssignments.map((a) => a.id)).toEqual([a2.id, a1.id]);
    expect(data.dueAssignments[0].submissionStatus).toBe("NOT_SUBMITTED");
  });

  // ── behavior 3: attendance percentage per module offering ──────────────────

  it("returns attendance percentage per module offering", async () => {
    const { student, educator, moduleOfferings } = await createOfferingSetup(["Programming"]);
    const [mo] = moduleOfferings;
    const sessionType = await createSessionType();
    const now = new Date("2026-05-20T10:00:00.000Z");

    const session = await prisma.classSession.create({
      data: {
        moduleOfferingId: mo.id,
        sessionTypeId: sessionType.id,
        startAt: new Date("2026-05-19T09:00:00.000Z"),
        finishAt: new Date("2026-05-19T11:00:00.000Z"),
        attendanceRequired: true,
        createdById: educator.id,
      },
    });
    createdClassSessionIds.push(session.id);

    await submitAttendance({
      classSessionId: session.id,
      educatorId: educator.id,
      submittedAt: new Date("2026-05-19T09:30:00.000Z"),
      attendanceEntries: [{ studentId: student.id, status: "PRESENT" }],
    });

    const data = await getStudentDashboard(student.id, now);

    expect(data.attendanceByModuleOffering).toHaveLength(1);
    expect(data.attendanceByModuleOffering[0].moduleOfferingId).toBe(mo.id);
    expect(data.attendanceByModuleOffering[0].percentage).toBe(100);
  });

  // ── behavior 4: released component marks only ──────────────────────────────

  it("returns only released component marks", async () => {
    const { student, educator, admin, moduleOfferings } = await createOfferingSetup(["Programming"]);
    const [mo] = moduleOfferings;
    const now = new Date("2026-05-20T10:00:00.000Z");

    const component = await createAssessmentComponent({
      moduleOfferingId: mo.id,
      createdById: admin.id,
      title: "Midterm",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 50,
      maximumMark: 100,
      sortOrder: 1,
    });

    const draftComponent = await createAssessmentComponent({
      moduleOfferingId: mo.id,
      createdById: admin.id,
      title: "Draft Component",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 50,
      maximumMark: 100,
      sortOrder: 2,
    });

    await upsertComponentMark({ assessmentComponentId: component.id, studentId: student.id, score: 75, markedById: educator.id });
    await releaseComponentMark({ componentMarkId: (await prisma.componentMark.findFirstOrThrow({ where: { assessmentComponentId: component.id, studentId: student.id } })).id, releasedById: educator.id });

    await upsertComponentMark({ assessmentComponentId: draftComponent.id, studentId: student.id, score: 60, markedById: educator.id });
    // draft mark not released

    const data = await getStudentDashboard(student.id, now);

    expect(data.releasedMarks).toHaveLength(1);
    expect(data.releasedMarks[0].score).toBe(75);
    expect(data.releasedMarks[0].assessmentComponentTitle).toBe("Midterm");
  });

  // ── behavior 5: released final grades only ────────────────────────────────

  it("returns only released final grades", async () => {
    const { student, educator, admin, moduleOfferings } = await createOfferingSetup(["Programming"]);
    const [mo] = moduleOfferings;
    const now = new Date("2026-05-20T10:00:00.000Z");

    // Need 100% weighted components to release final grades
    const component = await createAssessmentComponent({
      moduleOfferingId: mo.id,
      createdById: admin.id,
      title: "Final",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 100,
      maximumMark: 100,
      sortOrder: 1,
    });

    await upsertComponentMark({ assessmentComponentId: component.id, studentId: student.id, score: 80, markedById: educator.id });
    await releaseComponentMark({ componentMarkId: (await prisma.componentMark.findFirstOrThrow({ where: { assessmentComponentId: component.id, studentId: student.id } })).id, releasedById: educator.id });
    await releaseFinalGrades({ moduleOfferingId: mo.id, releasedById: educator.id });

    const data = await getStudentDashboard(student.id, now);

    expect(data.releasedFinalGrades).toHaveLength(1);
    expect(data.releasedFinalGrades[0].percentage).toBe(80);
    expect(data.releasedFinalGrades[0].isPassing).toBe(true);
  });

  // ── behavior 6: unread chat activity ──────────────────────────────────────

  it("detects unread chat activity and mentions per module group chat", async () => {
    const { student, educator, moduleOfferings } = await createOfferingSetup(["Programming"]);
    const [mo] = moduleOfferings;
    const now = new Date("2026-05-20T10:00:00.000Z");

    const chat = await prisma.moduleGroupChat.findUniqueOrThrow({ where: { moduleOfferingId: mo.id } });

    // educator posts a message — student hasn't seen it
    await sendChatMessage({ chatId: chat.id, senderId: educator.id, body: "Hello class!" });

    const data = await getStudentDashboard(student.id, now);

    expect(data.chatActivity).toHaveLength(1);
    expect(data.chatActivity[0].chatId).toBe(chat.id);
    expect(data.chatActivity[0].hasUnread).toBe(true);
  });

  // ── behavior 7: upcoming calendar events ──────────────────────────────────

  it("returns upcoming calendar events for the student", async () => {
    const { student, educator, moduleOfferings } = await createOfferingSetup(["Programming"]);
    const [mo] = moduleOfferings;
    const now = new Date("2026-05-20T10:00:00.000Z");

    const admin = await createTestUserAccount("ADMINISTRATOR");
    const event = await prisma.institutionEvent.create({
      data: { title: "Graduation Ceremony", startAt: new Date("2026-06-01T09:00:00.000Z"), createdById: admin.id },
    });
    createdInstitutionEventIds.push(event.id);

    const data = await getStudentDashboard(student.id, now);

    const found = data.upcomingCalendarEvents.find((e) => e.id === event.id);
    expect(found).toBeDefined();
    expect(found?.title).toBe("Graduation Ceremony");
  });

  // ── behavior 8: course progress by academic level ─────────────────────────

  it("returns course progress by academic level", async () => {
    const { student, educator, admin, moduleOfferings, academicLevelId } = await createOfferingSetup(["Programming", "Databases"]);
    const [mo1] = moduleOfferings;
    const now = new Date("2026-05-20T10:00:00.000Z");

    // Release a passing final grade for mo1 only
    const component = await createAssessmentComponent({
      moduleOfferingId: mo1.id,
      createdById: admin.id,
      title: "Final",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 100,
      maximumMark: 100,
      sortOrder: 1,
    });
    await upsertComponentMark({ assessmentComponentId: component.id, studentId: student.id, score: 80, markedById: educator.id });
    await releaseComponentMark({ componentMarkId: (await prisma.componentMark.findFirstOrThrow({ where: { assessmentComponentId: component.id, studentId: student.id } })).id, releasedById: educator.id });
    await releaseFinalGrades({ moduleOfferingId: mo1.id, releasedById: educator.id });

    const data = await getStudentDashboard(student.id, now);

    expect(data.courseProgress).toHaveLength(1);
    expect(data.courseProgress[0].academicLevelId).toBe(academicLevelId);
    expect(data.courseProgress[0].completedModules).toBe(1);
    expect(data.courseProgress[0].totalModules).toBe(2);
  });

  // ── behavior 9: attention item — low attendance ───────────────────────────

  it("generates Attention Item when attendance is below the Attendance Risk Threshold", async () => {
    const { student, educator, moduleOfferings } = await createOfferingSetup(["Programming"]);
    const [mo] = moduleOfferings;
    const sessionType = await createSessionType();
    const now = new Date("2026-05-20T10:00:00.000Z");

    // Create 5 sessions, student absent for all — 0% attendance
    for (let i = 0; i < 5; i++) {
      const session = await prisma.classSession.create({
        data: {
          moduleOfferingId: mo.id,
          sessionTypeId: sessionType.id,
          startAt: new Date(`2026-05-0${i + 1}T09:00:00.000Z`),
          finishAt: new Date(`2026-05-0${i + 1}T11:00:00.000Z`),
          attendanceRequired: true,
          createdById: educator.id,
        },
      });
      createdClassSessionIds.push(session.id);
      await submitAttendance({
        classSessionId: session.id,
        educatorId: educator.id,
        submittedAt: new Date(`2026-05-0${i + 1}T09:30:00.000Z`),
        attendanceEntries: [{ studentId: student.id, status: "ABSENT" }],
      });
    }

    const data = await getStudentDashboard(student.id, now);

    const item = data.attentionItems.find((a) => a.kind === "LOW_ATTENDANCE");
    expect(item).toBeDefined();
    expect(item?.message).not.toMatch(/at.?risk/i);
    expect(item?.moduleOfferingId).toBe(mo.id);
  });

  // ── behavior 10: attention item — overdue assignment without submission ────

  it("generates Attention Item for overdue assignment without submission", async () => {
    const { student, educator, moduleOfferings } = await createOfferingSetup(["Programming"]);
    const [mo] = moduleOfferings;

    const assignment = await createAssignment({
      moduleOfferingId: mo.id,
      createdById: educator.id,
      title: "Overdue Assignment",
      body: "body",
      deadline: new Date("2026-05-01T23:59:00.000Z"), // in the past
      maximumMark: 100,
    });
    await publishAssignment({ id: assignment.id, publishedById: educator.id });

    const now = new Date("2026-05-20T10:00:00.000Z");
    const data = await getStudentDashboard(student.id, now);

    const item = data.attentionItems.find((a) => a.kind === "OVERDUE_ASSIGNMENT");
    expect(item).toBeDefined();
    expect(item?.assignmentId).toBe(assignment.id);
    expect(item?.message).not.toMatch(/at.?risk/i);
  });

  // ── behavior 11: attention item — released final grade below pass threshold

  it("generates Attention Item when a Released Final Grade is below the Pass Threshold", async () => {
    const { student, educator, admin, moduleOfferings } = await createOfferingSetup(["Programming"]);
    const [mo] = moduleOfferings;
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

    const data = await getStudentDashboard(student.id, now);

    const item = data.attentionItems.find((a) => a.kind === "FAILED_FINAL_GRADE");
    expect(item).toBeDefined();
    expect(item?.moduleOfferingId).toBe(mo.id);
    expect(item?.message).not.toMatch(/at.?risk/i);
  });

  // ── behavior 12: attention item — assignment due within reminder period ────

  it("generates Attention Item for assignment due within the Reminder Period", async () => {
    const { student, educator, moduleOfferings } = await createOfferingSetup(["Programming"]);
    const [mo] = moduleOfferings;

    // Assignment due in 5 days, default reminder period is 15 days
    const deadline = new Date("2026-05-25T23:59:00.000Z");
    const assignment = await createAssignment({ moduleOfferingId: mo.id, createdById: educator.id, title: "Upcoming Assignment", body: "body", deadline, maximumMark: 100 });
    await publishAssignment({ id: assignment.id, publishedById: educator.id });

    const now = new Date("2026-05-20T10:00:00.000Z");
    const data = await getStudentDashboard(student.id, now);

    const item = data.attentionItems.find((a) => a.kind === "UPCOMING_DEADLINE" && a.assignmentId === assignment.id);
    expect(item).toBeDefined();
    expect(item?.message).not.toMatch(/at.?risk/i);
  });
});
