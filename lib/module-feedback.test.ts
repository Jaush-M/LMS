import { describe, it, expect, afterEach } from "vitest";
import {
  openFeedbackPeriod,
  submitFeedbackResponse,
  getFeedbackReport,
  moderateFeedbackResponse,
} from "./module-feedback";
import { createAccount } from "./accounts";
import { createFaculty, createCourse, createModule, createIntake, createStudyMode } from "./catalogue";
import { createCurriculumTemplate, addAcademicLevel, addTemplateModule } from "./curriculum-template";
import { createCourseOfferingFromTemplate } from "./course-offering";
import { enrollStudent } from "./enrollment";
import { prisma } from "./prisma";
import type { UserRole } from "./generated/prisma/enums";

// ── cleanup tracking ──────────────────────────────────────────────────────────

const createdFeedbackPeriodIds: string[] = [];
const createdCourseOfferingIds: string[] = [];
const createdTemplateIds: string[] = [];
const createdCourseIds: string[] = [];
const createdFacultyIds: string[] = [];
const createdModuleIds: string[] = [];
const createdIntakeIds: string[] = [];
const createdStudyModeIds: string[] = [];
const createdUserIds: string[] = [];
const createdEnrollmentIds: string[] = [];

async function cleanup() {
  if (createdFeedbackPeriodIds.length) {
    await prisma.feedbackPeriod.deleteMany({ where: { id: { in: [...createdFeedbackPeriodIds] } } });
    createdFeedbackPeriodIds.length = 0;
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
  if (createdUserIds.length) {
    const userAccountIds = await prisma.userAccount.findMany({
      where: { userId: { in: [...createdUserIds] } },
      select: { id: true },
    });
    const uaIds = userAccountIds.map((ua) => ua.id);
    await prisma.auditLogEntry.deleteMany({ where: { actorId: { in: uaIds } } });
    await prisma.userAccount.deleteMany({ where: { userId: { in: [...createdUserIds] } } });
    await prisma.account.deleteMany({ where: { userId: { in: [...createdUserIds] } } });
    await prisma.user.deleteMany({ where: { id: { in: [...createdUserIds] } } });
    createdUserIds.length = 0;
  }
}

// ── test helpers ──────────────────────────────────────────────────────────────

async function createTestUserAccount(role: UserRole) {
  const result = await createAccount({ name: `Test ${role}`, role: role as "ADMINISTRATOR" | "EDUCATOR" | "STUDENT" });
  createdUserIds.push(result.userId);
  const ua = await prisma.userAccount.findUniqueOrThrow({ where: { userId: result.userId } });
  return ua;
}

async function createOfferingSetup() {
  const faculty = await prisma.faculty.create({ data: { name: "Test Faculty" } });
  createdFacultyIds.push(faculty.id);

  const course = await prisma.course.create({
    data: { code: `C-${Date.now()}`, name: "Test Course", awardLevel: "DIPLOMA", facultyId: faculty.id },
  });
  createdCourseIds.push(course.id);

  const mod = await prisma.module.create({ data: { code: `M-${Date.now()}`, name: "Test Module" } });
  createdModuleIds.push(mod.id);

  const intake = await prisma.intake.create({ data: { name: `Intake-${Date.now()}` } });
  createdIntakeIds.push(intake.id);

  const studyMode = await prisma.studyMode.create({ data: { name: `Mode-${Date.now()}` } });
  createdStudyModeIds.push(studyMode.id);

  const educator = await createTestUserAccount("EDUCATOR");

  const template = await createCurriculumTemplate(course.id);
  createdTemplateIds.push(template.id);

  const level = await addAcademicLevel(template.id, { label: "Level 1", sortOrder: 1 });
  const tm = await addTemplateModule(template.id, {
    academicLevelId: level.id,
    moduleId: mod.id,
    credits: 10,
    sortOrder: 1,
  });

  const offering = await createCourseOfferingFromTemplate({
    curriculumTemplateId: template.id,
    intakeId: intake.id,
    studyModeId: studyMode.id,
    name: "Test Offering",
    startAt: new Date("2026-01-01"),
    finishAt: new Date("2026-12-31"),
    moduleOfferings: [
      {
        templateModuleId: tm.id,
        primaryEducatorId: educator.id,
        startAt: new Date("2026-01-01"),
        finishAt: new Date("2026-12-31"),
      },
    ],
  });
  createdCourseOfferingIds.push(offering.id);

  const moduleOffering = await prisma.moduleOffering.findFirstOrThrow({
    where: { courseOfferingId: offering.id, templateModuleId: tm.id },
  });

  return { offering, moduleOffering, educator };
}

// ── openFeedbackPeriod ────────────────────────────────────────────────────────

describe("openFeedbackPeriod", () => {
  afterEach(cleanup);

  it("Administrator opens a Feedback Period for a Module Offering", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { moduleOffering } = await createOfferingSetup();

    const openAt = new Date("2026-06-01");
    const closeAt = new Date("2026-06-14");

    const period = await openFeedbackPeriod({
      moduleOfferingId: moduleOffering.id,
      openAt,
      closeAt,
      createdById: admin.id,
    });
    createdFeedbackPeriodIds.push(period.id);

    expect(period.moduleOfferingId).toBe(moduleOffering.id);
    expect(period.openAt).toEqual(openAt);
    expect(period.closeAt).toEqual(closeAt);
    expect(period.createdById).toBe(admin.id);
  });

  it("non-Administrator cannot open a Feedback Period", async () => {
    const educator = await createTestUserAccount("EDUCATOR");
    const { moduleOffering } = await createOfferingSetup();

    await expect(
      openFeedbackPeriod({
        moduleOfferingId: moduleOffering.id,
        openAt: new Date("2026-06-01"),
        closeAt: new Date("2026-06-14"),
        createdById: educator.id,
      })
    ).rejects.toThrow("Permission denied");
  });

  it("opening a second Feedback Period for the same Module Offering is rejected", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { moduleOffering } = await createOfferingSetup();

    const period = await openFeedbackPeriod({
      moduleOfferingId: moduleOffering.id,
      openAt: new Date("2026-06-01"),
      closeAt: new Date("2026-06-14"),
      createdById: admin.id,
    });
    createdFeedbackPeriodIds.push(period.id);

    await expect(
      openFeedbackPeriod({
        moduleOfferingId: moduleOffering.id,
        openAt: new Date("2026-07-01"),
        closeAt: new Date("2026-07-14"),
        createdById: admin.id,
      })
    ).rejects.toThrow("Feedback Period already exists");
  });
});

// ── submitFeedbackResponse ────────────────────────────────────────────────────

describe("submitFeedbackResponse", () => {
  afterEach(cleanup);

  it("Student with Effective Module Access submits a feedback response during an open period", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const { offering, moduleOffering } = await createOfferingSetup();

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const now = new Date();
    const period = await openFeedbackPeriod({
      moduleOfferingId: moduleOffering.id,
      openAt: new Date(now.getTime() - 86400_000),
      closeAt: new Date(now.getTime() + 86400_000),
      createdById: admin.id,
    });
    createdFeedbackPeriodIds.push(period.id);

    const response = await submitFeedbackResponse({
      moduleOfferingId: moduleOffering.id,
      studentId: student.id,
      rating: 4,
      comment: "Great module",
    });

    expect(response.feedbackPeriodId).toBe(period.id);
    expect(response.studentId).toBe(student.id);
    expect(response.rating).toBe(4);
    expect(response.comment).toBe("Great module");
    expect(response.status).toBe("ACTIVE");
  });

  it("duplicate submission for the same period is rejected", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const { offering, moduleOffering } = await createOfferingSetup();

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const now = new Date();
    const period = await openFeedbackPeriod({
      moduleOfferingId: moduleOffering.id,
      openAt: new Date(now.getTime() - 86400_000),
      closeAt: new Date(now.getTime() + 86400_000),
      createdById: admin.id,
    });
    createdFeedbackPeriodIds.push(period.id);

    await submitFeedbackResponse({ moduleOfferingId: moduleOffering.id, studentId: student.id, rating: 3 });

    await expect(
      submitFeedbackResponse({ moduleOfferingId: moduleOffering.id, studentId: student.id, rating: 5 })
    ).rejects.toThrow("already submitted");
  });

  it("Student without Effective Module Access cannot submit feedback", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const { moduleOffering } = await createOfferingSetup();

    const now = new Date();
    const period = await openFeedbackPeriod({
      moduleOfferingId: moduleOffering.id,
      openAt: new Date(now.getTime() - 86400_000),
      closeAt: new Date(now.getTime() + 86400_000),
      createdById: admin.id,
    });
    createdFeedbackPeriodIds.push(period.id);

    await expect(
      submitFeedbackResponse({ moduleOfferingId: moduleOffering.id, studentId: student.id, rating: 4 })
    ).rejects.toThrow("Permission denied");
  });

  it("submission is rejected when the Feedback Period is not open", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const { offering, moduleOffering } = await createOfferingSetup();

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const period = await openFeedbackPeriod({
      moduleOfferingId: moduleOffering.id,
      openAt: new Date("2026-01-01"),
      closeAt: new Date("2026-01-07"),
      createdById: admin.id,
    });
    createdFeedbackPeriodIds.push(period.id);

    await expect(
      submitFeedbackResponse({ moduleOfferingId: moduleOffering.id, studentId: student.id, rating: 4 })
    ).rejects.toThrow("Feedback Period is not open");
  });
});

// ── getFeedbackReport ─────────────────────────────────────────────────────────

describe("getFeedbackReport", () => {
  afterEach(cleanup);

  it("assigned Educator gets aggregated report with no student identity after period closes", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, moduleOffering, educator } = await createOfferingSetup();

    const student1 = await createTestUserAccount("STUDENT");
    const student2 = await createTestUserAccount("STUDENT");

    for (const student of [student1, student2]) {
      const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
      if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
      createdEnrollmentIds.push(enrollment.enrollment.id);
    }

    const now = new Date();
    const period = await openFeedbackPeriod({
      moduleOfferingId: moduleOffering.id,
      openAt: new Date(now.getTime() - 86400_000 * 2),
      closeAt: new Date(now.getTime() - 86400_000),
      createdById: admin.id,
    });
    createdFeedbackPeriodIds.push(period.id);

    await prisma.feedbackResponse.createMany({
      data: [
        { feedbackPeriodId: period.id, studentId: student1.id, rating: 4, comment: "Good", updatedAt: new Date() },
        { feedbackPeriodId: period.id, studentId: student2.id, rating: 2, comment: "Needs work", updatedAt: new Date() },
      ],
    });

    const report = await getFeedbackReport({ moduleOfferingId: moduleOffering.id, requesterId: educator.id });

    expect(report.responseCount).toBe(2);
    expect(report.averageRating).toBeCloseTo(3);
    expect(report.comments).toContain("Good");
    expect(report.comments).toContain("Needs work");
    expect(report).not.toHaveProperty("responses");
  });

  it("Administrator gets per-response detail including student identity", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, moduleOffering } = await createOfferingSetup();

    const student = await createTestUserAccount("STUDENT");
    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const now = new Date();
    const period = await openFeedbackPeriod({
      moduleOfferingId: moduleOffering.id,
      openAt: new Date(now.getTime() - 86400_000 * 2),
      closeAt: new Date(now.getTime() - 86400_000),
      createdById: admin.id,
    });
    createdFeedbackPeriodIds.push(period.id);

    await prisma.feedbackResponse.create({
      data: { feedbackPeriodId: period.id, studentId: student.id, rating: 5, updatedAt: new Date() },
    });

    const report = await getFeedbackReport({ moduleOfferingId: moduleOffering.id, requesterId: admin.id });

    expect(report.responses).toBeDefined();
    expect(report.responses![0].studentId).toBe(student.id);
    expect(report.responses![0].rating).toBe(5);
  });

  it("moderated responses are excluded from the Educator's aggregated report", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, moduleOffering, educator } = await createOfferingSetup();

    const student1 = await createTestUserAccount("STUDENT");
    const student2 = await createTestUserAccount("STUDENT");

    for (const student of [student1, student2]) {
      const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
      if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
      createdEnrollmentIds.push(enrollment.enrollment.id);
    }

    const now = new Date();
    const period = await openFeedbackPeriod({
      moduleOfferingId: moduleOffering.id,
      openAt: new Date(now.getTime() - 86400_000 * 2),
      closeAt: new Date(now.getTime() - 86400_000),
      createdById: admin.id,
    });
    createdFeedbackPeriodIds.push(period.id);

    await prisma.feedbackResponse.createMany({
      data: [
        { feedbackPeriodId: period.id, studentId: student1.id, rating: 5, comment: "Excellent", updatedAt: new Date() },
        { feedbackPeriodId: period.id, studentId: student2.id, rating: 1, comment: "Inappropriate", status: "MODERATED", updatedAt: new Date() },
      ],
    });

    const report = await getFeedbackReport({ moduleOfferingId: moduleOffering.id, requesterId: educator.id });

    expect(report.responseCount).toBe(1);
    expect(report.averageRating).toBe(5);
    expect(report.comments).toContain("Excellent");
    expect(report.comments).not.toContain("Inappropriate");
  });

  it("non-assigned Educator cannot access the Feedback Report", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const otherEducator = await createTestUserAccount("EDUCATOR");
    const { moduleOffering } = await createOfferingSetup();

    const now = new Date();
    const period = await openFeedbackPeriod({
      moduleOfferingId: moduleOffering.id,
      openAt: new Date(now.getTime() - 86400_000 * 2),
      closeAt: new Date(now.getTime() - 86400_000),
      createdById: admin.id,
    });
    createdFeedbackPeriodIds.push(period.id);

    await expect(
      getFeedbackReport({ moduleOfferingId: moduleOffering.id, requesterId: otherEducator.id })
    ).rejects.toThrow("Permission denied");
  });
});

// ── moderateFeedbackResponse ──────────────────────────────────────────────────

describe("moderateFeedbackResponse", () => {
  afterEach(cleanup);

  it("Administrator can moderate a feedback response", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, moduleOffering } = await createOfferingSetup();

    const student = await createTestUserAccount("STUDENT");
    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const now = new Date();
    const period = await openFeedbackPeriod({
      moduleOfferingId: moduleOffering.id,
      openAt: new Date(now.getTime() - 86400_000 * 2),
      closeAt: new Date(now.getTime() - 86400_000),
      createdById: admin.id,
    });
    createdFeedbackPeriodIds.push(period.id);

    const responseRecord = await prisma.feedbackResponse.create({
      data: { feedbackPeriodId: period.id, studentId: student.id, rating: 1, comment: "Bad words", updatedAt: new Date() },
    });

    await moderateFeedbackResponse({ responseId: responseRecord.id, moderatedById: admin.id });

    const updated = await prisma.feedbackResponse.findUniqueOrThrow({ where: { id: responseRecord.id } });
    expect(updated.status).toBe("MODERATED");
  });

  it("non-Administrator cannot moderate a feedback response", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, moduleOffering, educator } = await createOfferingSetup();

    const student = await createTestUserAccount("STUDENT");
    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const now = new Date();
    const period = await openFeedbackPeriod({
      moduleOfferingId: moduleOffering.id,
      openAt: new Date(now.getTime() - 86400_000 * 2),
      closeAt: new Date(now.getTime() - 86400_000),
      createdById: admin.id,
    });
    createdFeedbackPeriodIds.push(period.id);

    const responseRecord = await prisma.feedbackResponse.create({
      data: { feedbackPeriodId: period.id, studentId: student.id, rating: 1, updatedAt: new Date() },
    });

    await expect(
      moderateFeedbackResponse({ responseId: responseRecord.id, moderatedById: educator.id })
    ).rejects.toThrow("Permission denied");
  });
});
