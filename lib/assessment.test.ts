import { describe, it, expect, afterEach } from "vitest";
import {
  createAssessmentComponent,
  updateAssessmentComponent,
  listAssessmentComponents,
  upsertComponentMark,
  listComponentMarks,
  releaseComponentMark,
  releaseFinalGrades,
  listFinalGrades,
  exportMarksCSV,
  correctFinalGrade,
} from "./assessment";
import { createFaculty, createCourse, createModule, createIntake, createStudyMode } from "./catalogue";
import { createCurriculumTemplate, addAcademicLevel, addTemplateModule } from "./curriculum-template";
import { createCourseOfferingFromTemplate } from "./course-offering";
import { enrollStudent } from "./enrollment";
import { prisma } from "./prisma";
import type { UserRole } from "./generated/prisma/enums";

// ── cleanup tracking ──────────────────────────────────────────────────────────

const createdAssessmentComponentIds: string[] = [];
const createdComponentMarkIds: string[] = [];
const createdFinalGradeIds: string[] = [];
const createdCourseOfferingIds: string[] = [];
const createdTemplateIds: string[] = [];
const createdCourseIds: string[] = [];
const createdFacultyIds: string[] = [];
const createdModuleIds: string[] = [];
const createdIntakeIds: string[] = [];
const createdStudyModeIds: string[] = [];
const createdUserIds: string[] = [];
const createdEnrollmentIds: string[] = [];
const createdSystemSettingsIds: string[] = [];

async function cleanup() {
  if (createdEnrollmentIds.length) {
    await prisma.enrollment.deleteMany({ where: { id: { in: [...createdEnrollmentIds] } } });
    createdEnrollmentIds.length = 0;
  }
  if (createdFinalGradeIds.length) {
    await prisma.auditLogEntry.deleteMany({
      where: { entityType: "FinalGrade", entityId: { in: [...createdFinalGradeIds] } },
    });
    await prisma.finalGrade.deleteMany({ where: { id: { in: [...createdFinalGradeIds] } } });
    createdFinalGradeIds.length = 0;
  }
  if (createdComponentMarkIds.length) {
    await prisma.componentMark.deleteMany({ where: { id: { in: [...createdComponentMarkIds] } } });
    createdComponentMarkIds.length = 0;
  }
  if (createdAssessmentComponentIds.length) {
    await prisma.assessmentComponent.deleteMany({ where: { id: { in: [...createdAssessmentComponentIds] } } });
    createdAssessmentComponentIds.length = 0;
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
    await prisma.user.deleteMany({ where: { id: { in: [...createdUserIds] } } });
    createdUserIds.length = 0;
  }
  if (createdSystemSettingsIds.length) {
    await prisma.systemSettings.deleteMany({ where: { id: { in: [...createdSystemSettingsIds] } } });
    createdSystemSettingsIds.length = 0;
  }
}

afterEach(cleanup);

// ── test helpers ──────────────────────────────────────────────────────────────

let seq = 0;
function uniqueCode(prefix: string) {
  return `${prefix}${Date.now()}${++seq}`;
}

async function createTestUserAccount(role: UserRole, status: "ACTIVE" | "INACTIVE" | "DISABLED" = "ACTIVE") {
  const userId = crypto.randomUUID();
  const identifier = uniqueCode(`T${role.slice(0, 1)}`);
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
          status,
          mustChangePassword: false,
        },
      },
    },
  });
  createdUserIds.push(userId);
  return prisma.userAccount.findUniqueOrThrow({ where: { userId } });
}

async function createOfferingSetup(moduleNames: string[]) {
  const faculty = await createFaculty({ name: `Faculty ${uniqueCode("F")}` });
  createdFacultyIds.push(faculty.id);
  const course = await createCourse({
    code: uniqueCode("CRS"),
    name: "Software Engineering",
    awardLevel: "DEGREE",
    facultyId: faculty.id,
  });
  createdCourseIds.push(course.id);
  const intake = await createIntake({ name: `Sep ${uniqueCode("I")}` });
  createdIntakeIds.push(intake.id);
  const studyMode = await createStudyMode({ name: `Blended ${uniqueCode("SM")}` });
  createdStudyModeIds.push(studyMode.id);
  const template = await createCurriculumTemplate(course.id);
  createdTemplateIds.push(template.id);
  const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1 });

  const educators: Awaited<ReturnType<typeof createTestUserAccount>>[] = [];
  const templateModules = [];
  for (const [index, moduleName] of moduleNames.entries()) {
    const educator = await createTestUserAccount("EDUCATOR");
    educators.push(educator);
    const mod = await createModule({ code: uniqueCode("MOD"), name: moduleName });
    createdModuleIds.push(mod.id);
    templateModules.push(
      await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: mod.id, credits: 15, sortOrder: index + 1 })
    );
  }

  const offering = await createCourseOfferingFromTemplate({
    curriculumTemplateId: template.id,
    intakeId: intake.id,
    studyModeId: studyMode.id,
    name: `SE ${uniqueCode("CO")}`,
    startAt: new Date("2026-09-01T00:00:00.000Z"),
    finishAt: new Date("2027-06-30T00:00:00.000Z"),
    capacity: 30,
    moduleOfferings: templateModules.map((tm, i) => ({ templateModuleId: tm.id, primaryEducatorId: educators[i].id })),
  });
  createdCourseOfferingIds.push(offering.id);

  const moduleOfferings = await prisma.moduleOffering.findMany({
    where: { courseOfferingId: offering.id },
    orderBy: { templateModule: { sortOrder: "asc" } },
  });

  return { offering, moduleOfferings, educators };
}

async function createSystemSettings(passThresholdPercent = 50) {
  const settings = await prisma.systemSettings.create({
    data: { passThresholdPercent },
  });
  createdSystemSettingsIds.push(settings.id);
  return settings;
}

// ── createAssessmentComponent ─────────────────────────────────────────────────

describe("createAssessmentComponent", () => {
  it("Administrator creates an Assessment Component — stored with correct fields", async () => {
    const { moduleOfferings } = await createOfferingSetup(["Web Development"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const moduleOffering = moduleOfferings[0];

    const component = await createAssessmentComponent({
      moduleOfferingId: moduleOffering.id,
      createdById: admin.id,
      title: "Assignment 1",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 40,
      maximumMark: 100,
      sortOrder: 1,
    });
    createdAssessmentComponentIds.push(component.id);

    expect(component.moduleOfferingId).toBe(moduleOffering.id);
    expect(component.title).toBe("Assignment 1");
    expect(component.type).toBe("OFFLINE_ASSESSMENT");
    expect(component.weightPercent).toBe(40);
    expect(component.maximumMark).toBe(100);
    expect(component.sortOrder).toBe(1);
    expect(component.assignmentId).toBeNull();
  });

  it("Educator assigned to Module Offering can create an Assessment Component", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Web Development"]);
    const educator = educators[0];
    const moduleOffering = moduleOfferings[0];

    const component = await createAssessmentComponent({
      moduleOfferingId: moduleOffering.id,
      createdById: educator.id,
      title: "Practical Exam",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 30,
      maximumMark: 50,
      sortOrder: 1,
    });
    createdAssessmentComponentIds.push(component.id);

    expect(component.title).toBe("Practical Exam");
  });

  it("Student cannot create an Assessment Component", async () => {
    const { moduleOfferings } = await createOfferingSetup(["Web Development"]);
    const student = await createTestUserAccount("STUDENT");
    const moduleOffering = moduleOfferings[0];

    await expect(
      createAssessmentComponent({
        moduleOfferingId: moduleOffering.id,
        createdById: student.id,
        title: "Quiz",
        type: "OFFLINE_ASSESSMENT",
        weightPercent: 20,
        maximumMark: 100,
        sortOrder: 1,
      })
    ).rejects.toThrow("Permission denied");
  });

  it("Educator not assigned to Module Offering cannot create an Assessment Component", async () => {
    const { moduleOfferings } = await createOfferingSetup(["Web Development"]);
    const otherEducator = await createTestUserAccount("EDUCATOR");
    const moduleOffering = moduleOfferings[0];

    await expect(
      createAssessmentComponent({
        moduleOfferingId: moduleOffering.id,
        createdById: otherEducator.id,
        title: "Quiz",
        type: "OFFLINE_ASSESSMENT",
        weightPercent: 20,
        maximumMark: 100,
        sortOrder: 1,
      })
    ).rejects.toThrow("Permission denied");
  });
});

// ── updateAssessmentComponent ─────────────────────────────────────────────────

describe("updateAssessmentComponent", () => {
  it("Educator can update Assessment Component details before any marks exist", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Databases"]);
    const educator = educators[0];
    const moduleOffering = moduleOfferings[0];

    const component = await createAssessmentComponent({
      moduleOfferingId: moduleOffering.id,
      createdById: educator.id,
      title: "Quiz 1",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 30,
      maximumMark: 50,
      sortOrder: 1,
    });
    createdAssessmentComponentIds.push(component.id);

    const updated = await updateAssessmentComponent({
      id: component.id,
      updatedById: educator.id,
      title: "Quiz 1 (Updated)",
      weightPercent: 25,
    });

    expect(updated.title).toBe("Quiz 1 (Updated)");
    expect(updated.weightPercent).toBe(25);
  });

  it("Educator cannot update Assessment Component structure once a Component Mark exists — Locked Assessment Component", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Databases"]);
    const educator = educators[0];
    const moduleOffering = moduleOfferings[0];
    const student = await createTestUserAccount("STUDENT");

    const component = await createAssessmentComponent({
      moduleOfferingId: moduleOffering.id,
      createdById: educator.id,
      title: "Quiz 1",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 30,
      maximumMark: 50,
      sortOrder: 1,
    });
    createdAssessmentComponentIds.push(component.id);

    const mark = await upsertComponentMark({
      assessmentComponentId: component.id,
      studentId: student.id,
      markedById: educator.id,
      score: 40,
    });
    createdComponentMarkIds.push(mark.id);

    await expect(
      updateAssessmentComponent({
        id: component.id,
        updatedById: educator.id,
        title: "Quiz 1 Renamed",
      })
    ).rejects.toThrow("locked");
  });
});

// ── upsertComponentMark / releaseComponentMark ────────────────────────────────

describe("upsertComponentMark", () => {
  it("Educator enters a Component Mark — it is draft and not visible to the Student", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Algorithms"]);
    const educator = educators[0];
    const moduleOffering = moduleOfferings[0];
    const student = await createTestUserAccount("STUDENT");

    const component = await createAssessmentComponent({
      moduleOfferingId: moduleOffering.id,
      createdById: educator.id,
      title: "Final Exam",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 100,
      maximumMark: 100,
      sortOrder: 1,
    });
    createdAssessmentComponentIds.push(component.id);

    const mark = await upsertComponentMark({
      assessmentComponentId: component.id,
      studentId: student.id,
      markedById: educator.id,
      score: 72,
      feedback: "Good effort",
    });
    createdComponentMarkIds.push(mark.id);

    expect(mark.status).toBe("DRAFT");

    const studentView = await listComponentMarks({ assessmentComponentId: component.id, viewerId: student.id });
    expect(studentView).toHaveLength(0);
  });
});

describe("releaseComponentMark", () => {
  it("Educator releases a Component Mark — Student can see it and receives a notification", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Algorithms"]);
    const educator = educators[0];
    const moduleOffering = moduleOfferings[0];
    const student = await createTestUserAccount("STUDENT");

    const component = await createAssessmentComponent({
      moduleOfferingId: moduleOffering.id,
      createdById: educator.id,
      title: "Final Exam",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 100,
      maximumMark: 100,
      sortOrder: 1,
    });
    createdAssessmentComponentIds.push(component.id);

    const mark = await upsertComponentMark({
      assessmentComponentId: component.id,
      studentId: student.id,
      markedById: educator.id,
      score: 72,
    });
    createdComponentMarkIds.push(mark.id);

    const released = await releaseComponentMark({ componentMarkId: mark.id, releasedById: educator.id });
    expect(released.status).toBe("RELEASED");

    const studentView = await listComponentMarks({ assessmentComponentId: component.id, viewerId: student.id });
    expect(studentView).toHaveLength(1);
    expect(studentView[0].score).toBe(72);

    const notification = await prisma.notification.findFirst({
      where: { recipientId: student.id, sourceType: "COMPONENT_MARK", componentMarkId: mark.id },
    });
    expect(notification).not.toBeNull();
    expect(notification!.title).toBe("A mark has been released for you");
  });
});

// ── releaseFinalGrades ────────────────────────────────────────────────────────

describe("releaseFinalGrades — weight enforcement", () => {
  it("releaseFinalGrades is blocked when total component weights do not equal 100%", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Statistics"]);
    const educator = educators[0];
    const moduleOffering = moduleOfferings[0];

    const c1 = await createAssessmentComponent({
      moduleOfferingId: moduleOffering.id,
      createdById: educator.id,
      title: "Assignment",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 40,
      maximumMark: 100,
      sortOrder: 1,
    });
    createdAssessmentComponentIds.push(c1.id);

    const c2 = await createAssessmentComponent({
      moduleOfferingId: moduleOffering.id,
      createdById: educator.id,
      title: "Exam",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 40,
      maximumMark: 100,
      sortOrder: 2,
    });
    createdAssessmentComponentIds.push(c2.id);

    await expect(
      releaseFinalGrades({ moduleOfferingId: moduleOffering.id, releasedById: educator.id })
    ).rejects.toThrow("100%");
  });
});

describe("releaseFinalGrades — calculation and release", () => {
  async function setupWithTwoComponents() {
    const { offering, moduleOfferings, educators } = await createOfferingSetup(["Linear Algebra"]);
    const educator = educators[0];
    const moduleOffering = moduleOfferings[0];
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");

    const enrollResult = await enrollStudent({
      studentId: student.id,
      courseOfferingId: offering.id,
      enrolledById: admin.id,
    });
    if (enrollResult.status !== "enrolled") throw new Error("Enrollment failed");
    createdEnrollmentIds.push(enrollResult.enrollment.id);

    const c1 = await createAssessmentComponent({
      moduleOfferingId: moduleOffering.id,
      createdById: educator.id,
      title: "Coursework",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 40,
      maximumMark: 100,
      sortOrder: 1,
    });
    createdAssessmentComponentIds.push(c1.id);

    const c2 = await createAssessmentComponent({
      moduleOfferingId: moduleOffering.id,
      createdById: educator.id,
      title: "Final Exam",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 60,
      maximumMark: 100,
      sortOrder: 2,
    });
    createdAssessmentComponentIds.push(c2.id);

    return { moduleOffering, educator, student, c1, c2 };
  }

  it("Final Grade is calculated as sum of (score / maximumMark × weightPercent) across components", async () => {
    const { moduleOffering, educator, student, c1, c2 } = await setupWithTwoComponents();

    const m1 = await upsertComponentMark({ assessmentComponentId: c1.id, studentId: student.id, markedById: educator.id, score: 80 });
    createdComponentMarkIds.push(m1.id);
    const m2 = await upsertComponentMark({ assessmentComponentId: c2.id, studentId: student.id, markedById: educator.id, score: 70 });
    createdComponentMarkIds.push(m2.id);

    await createSystemSettings(50);

    const grades = await releaseFinalGrades({ moduleOfferingId: moduleOffering.id, releasedById: educator.id });
    createdFinalGradeIds.push(...grades.map((g) => g.id));

    // 80/100 × 40 + 70/100 × 60 = 32 + 42 = 74%
    expect(grades).toHaveLength(1);
    expect(grades[0].percentage).toBeCloseTo(74, 5);
    expect(grades[0].status).toBe("RELEASED");
  });

  it("Pass status is derived from the system pass threshold — student scoring above threshold passes", async () => {
    const { moduleOffering, educator, student, c1, c2 } = await setupWithTwoComponents();

    const m1 = await upsertComponentMark({ assessmentComponentId: c1.id, studentId: student.id, markedById: educator.id, score: 60 });
    createdComponentMarkIds.push(m1.id);
    const m2 = await upsertComponentMark({ assessmentComponentId: c2.id, studentId: student.id, markedById: educator.id, score: 55 });
    createdComponentMarkIds.push(m2.id);

    await createSystemSettings(50);

    const grades = await releaseFinalGrades({ moduleOfferingId: moduleOffering.id, releasedById: educator.id });
    createdFinalGradeIds.push(...grades.map((g) => g.id));

    // 60/100×40 + 55/100×60 = 24 + 33 = 57% → above 50% threshold
    expect(grades[0].isPassing).toBe(true);
  });

  it("Student scoring below the pass threshold fails", async () => {
    const { moduleOffering, educator, student, c1, c2 } = await setupWithTwoComponents();

    const m1 = await upsertComponentMark({ assessmentComponentId: c1.id, studentId: student.id, markedById: educator.id, score: 30 });
    createdComponentMarkIds.push(m1.id);
    const m2 = await upsertComponentMark({ assessmentComponentId: c2.id, studentId: student.id, markedById: educator.id, score: 25 });
    createdComponentMarkIds.push(m2.id);

    await createSystemSettings(50);

    const grades = await releaseFinalGrades({ moduleOfferingId: moduleOffering.id, releasedById: educator.id });
    createdFinalGradeIds.push(...grades.map((g) => g.id));

    // 30/100×40 + 25/100×60 = 12 + 15 = 27% → below threshold
    expect(grades[0].isPassing).toBe(false);
  });

  it("Student can see their Released Final Grade but not a Provisional one", async () => {
    const { moduleOffering, educator, student, c1, c2 } = await setupWithTwoComponents();
    const admin = await createTestUserAccount("ADMINISTRATOR");

    const m1 = await upsertComponentMark({ assessmentComponentId: c1.id, studentId: student.id, markedById: educator.id, score: 80 });
    createdComponentMarkIds.push(m1.id);
    const m2 = await upsertComponentMark({ assessmentComponentId: c2.id, studentId: student.id, markedById: educator.id, score: 70 });
    createdComponentMarkIds.push(m2.id);

    await createSystemSettings(50);

    // Insert a provisional grade directly to verify student cannot see it
    const provisional = await prisma.finalGrade.create({
      data: {
        moduleOfferingId: moduleOffering.id,
        studentId: student.id,
        percentage: 74,
        isPassing: true,
        status: "PROVISIONAL",
        releasedById: admin.id,
      },
    });
    createdFinalGradeIds.push(provisional.id);

    const studentView = await listFinalGrades({ moduleOfferingId: moduleOffering.id, viewerId: student.id });
    expect(studentView).toHaveLength(0);

    await prisma.finalGrade.update({ where: { id: provisional.id }, data: { status: "RELEASED" } });

    const afterRelease = await listFinalGrades({ moduleOfferingId: moduleOffering.id, viewerId: student.id });
    expect(afterRelease).toHaveLength(1);
    expect(afterRelease[0].percentage).toBeCloseTo(74, 5);
  });

  it("Releasing Final Grades sends a notification to each Student", async () => {
    const { moduleOffering, educator, student, c1, c2 } = await setupWithTwoComponents();

    const m1 = await upsertComponentMark({ assessmentComponentId: c1.id, studentId: student.id, markedById: educator.id, score: 80 });
    createdComponentMarkIds.push(m1.id);
    const m2 = await upsertComponentMark({ assessmentComponentId: c2.id, studentId: student.id, markedById: educator.id, score: 70 });
    createdComponentMarkIds.push(m2.id);

    await createSystemSettings(50);

    const grades = await releaseFinalGrades({ moduleOfferingId: moduleOffering.id, releasedById: educator.id });
    createdFinalGradeIds.push(...grades.map((g) => g.id));

    const notification = await prisma.notification.findFirst({
      where: { recipientId: student.id, sourceType: "FINAL_GRADE" },
    });
    expect(notification).not.toBeNull();
    expect(notification!.title).toBe("Your Final Grade has been released");
  });
});

// ── exportMarksCSV ────────────────────────────────────────────────────────────

describe("exportMarksCSV", () => {
  it("CSV contains Student Identifier, name, component score columns, Final Grade %, and Pass Status", async () => {
    const { offering, moduleOfferings, educators } = await createOfferingSetup(["Data Structures"]);
    const educator = educators[0];
    const moduleOffering = moduleOfferings[0];
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");

    const enrollResult = await enrollStudent({
      studentId: student.id,
      courseOfferingId: offering.id,
      enrolledById: admin.id,
    });
    if (enrollResult.status !== "enrolled") throw new Error("Enrollment failed");
    createdEnrollmentIds.push(enrollResult.enrollment.id);

    const c1 = await createAssessmentComponent({
      moduleOfferingId: moduleOffering.id,
      createdById: educator.id,
      title: "Lab Work",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 40,
      maximumMark: 50,
      sortOrder: 1,
    });
    createdAssessmentComponentIds.push(c1.id);

    const c2 = await createAssessmentComponent({
      moduleOfferingId: moduleOffering.id,
      createdById: educator.id,
      title: "Written Exam",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 60,
      maximumMark: 100,
      sortOrder: 2,
    });
    createdAssessmentComponentIds.push(c2.id);

    const m1 = await upsertComponentMark({ assessmentComponentId: c1.id, studentId: student.id, markedById: educator.id, score: 40 });
    createdComponentMarkIds.push(m1.id);
    const m2 = await upsertComponentMark({ assessmentComponentId: c2.id, studentId: student.id, markedById: educator.id, score: 80 });
    createdComponentMarkIds.push(m2.id);

    await createSystemSettings(50);
    const grades = await releaseFinalGrades({ moduleOfferingId: moduleOffering.id, releasedById: educator.id });
    createdFinalGradeIds.push(...grades.map((g) => g.id));

    const csv = await exportMarksCSV({ moduleOfferingId: moduleOffering.id, requestedById: educator.id });

    const lines = csv.split("\n");
    expect(lines[0]).toContain("Student Identifier");
    expect(lines[0]).toContain("Name");
    expect(lines[0]).toContain("Lab Work (/50)");
    expect(lines[0]).toContain("Written Exam (/100)");
    expect(lines[0]).toContain("Final Grade (%)");
    expect(lines[0]).toContain("Pass Status");

    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain(student.generatedIdentifier);
    expect(lines[1]).toContain("40");
    expect(lines[1]).toContain("80");
    // 40/50×40 + 80/100×60 = 32 + 48 = 80%
    expect(lines[1]).toContain("80.00");
    expect(lines[1]).toContain("Pass");
  });
});

// ── correctFinalGrade ─────────────────────────────────────────────────────────

describe("correctFinalGrade", () => {
  it("Administrator corrects a Released Final Grade — new percentage is stored", async () => {
    const { moduleOfferings } = await createOfferingSetup(["Machine Learning"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    await createSystemSettings(50);

    const grade = await prisma.finalGrade.create({
      data: {
        moduleOfferingId: moduleOfferings[0].id,
        studentId: student.id,
        percentage: 45,
        isPassing: false,
        status: "RELEASED",
        releasedById: admin.id,
      },
    });
    createdFinalGradeIds.push(grade.id);

    const corrected = await correctFinalGrade({
      finalGradeId: grade.id,
      correctedById: admin.id,
      percentage: 55,
      reason: "Marking error on question 3",
    });

    expect(corrected.percentage).toBeCloseTo(55, 5);
  });

  it("isPassing is recalculated from the system pass threshold after correction", async () => {
    const { moduleOfferings } = await createOfferingSetup(["Computer Networks"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    await createSystemSettings(60);

    const grade = await prisma.finalGrade.create({
      data: {
        moduleOfferingId: moduleOfferings[0].id,
        studentId: student.id,
        percentage: 45,
        isPassing: false,
        status: "RELEASED",
        releasedById: admin.id,
      },
    });
    createdFinalGradeIds.push(grade.id);

    // 59% is below 60% threshold → still failing
    const belowThreshold = await correctFinalGrade({
      finalGradeId: grade.id,
      correctedById: admin.id,
      percentage: 59,
      reason: "Recalculation after exam review",
    });
    expect(belowThreshold.isPassing).toBe(false);

    // 60% meets threshold → passing
    const atThreshold = await correctFinalGrade({
      finalGradeId: grade.id,
      correctedById: admin.id,
      percentage: 60,
      reason: "Recalculation after exam review",
    });
    expect(atThreshold.isPassing).toBe(true);
  });

  it("Correction creates an OPERATIONAL audit log entry with beforeJson, afterJson, and reason", async () => {
    const { moduleOfferings } = await createOfferingSetup(["Operating Systems"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    await createSystemSettings(50);

    const grade = await prisma.finalGrade.create({
      data: {
        moduleOfferingId: moduleOfferings[0].id,
        studentId: student.id,
        percentage: 48,
        isPassing: false,
        status: "RELEASED",
        releasedById: admin.id,
      },
    });
    createdFinalGradeIds.push(grade.id);

    await correctFinalGrade({
      finalGradeId: grade.id,
      correctedById: admin.id,
      percentage: 52,
      reason: "Clerical error in final tally",
    });

    const entry = await prisma.auditLogEntry.findFirst({
      where: { action: "FINAL_GRADE_CORRECTED", entityId: grade.id },
    });
    expect(entry).not.toBeNull();
    expect(entry!.eventType).toBe("OPERATIONAL");
    expect(entry!.actorId).toBe(admin.id);
    expect(entry!.entityType).toBe("FinalGrade");
    expect(entry!.reason).toBe("Clerical error in final tally");
    expect(JSON.parse(entry!.beforeJson!)).toMatchObject({ percentage: 48, isPassing: false });
    expect(JSON.parse(entry!.afterJson!)).toMatchObject({ percentage: 52, isPassing: true });
  });

  it("Student receives a notification when their Final Grade is corrected", async () => {
    const { moduleOfferings } = await createOfferingSetup(["Cybersecurity"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    await createSystemSettings(50);

    const grade = await prisma.finalGrade.create({
      data: {
        moduleOfferingId: moduleOfferings[0].id,
        studentId: student.id,
        percentage: 48,
        isPassing: false,
        status: "RELEASED",
        releasedById: admin.id,
      },
    });
    createdFinalGradeIds.push(grade.id);

    await correctFinalGrade({
      finalGradeId: grade.id,
      correctedById: admin.id,
      percentage: 62,
      reason: "Script re-marked",
    });

    const notification = await prisma.notification.findFirst({
      where: { recipientId: student.id, sourceType: "FINAL_GRADE", finalGradeId: grade.id, title: "Your Final Grade has been corrected" },
    });
    expect(notification).not.toBeNull();
  });

  it("Blank or whitespace reason is rejected", async () => {
    const { moduleOfferings } = await createOfferingSetup(["Embedded Systems"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    await createSystemSettings(50);

    const grade = await prisma.finalGrade.create({
      data: {
        moduleOfferingId: moduleOfferings[0].id,
        studentId: student.id,
        percentage: 55,
        isPassing: true,
        status: "RELEASED",
        releasedById: admin.id,
      },
    });
    createdFinalGradeIds.push(grade.id);

    await expect(
      correctFinalGrade({ finalGradeId: grade.id, correctedById: admin.id, percentage: 60, reason: "   " })
    ).rejects.toThrow("reason is required");
  });

  it("Student and Educator cannot correct a Final Grade — permission denied", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Software Testing"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const educator = educators[0];
    await createSystemSettings(50);

    const grade = await prisma.finalGrade.create({
      data: {
        moduleOfferingId: moduleOfferings[0].id,
        studentId: student.id,
        percentage: 70,
        isPassing: true,
        status: "RELEASED",
        releasedById: admin.id,
      },
    });
    createdFinalGradeIds.push(grade.id);

    await expect(
      correctFinalGrade({ finalGradeId: grade.id, correctedById: student.id, percentage: 80, reason: "Clerical fix" })
    ).rejects.toThrow("Permission denied");

    await expect(
      correctFinalGrade({ finalGradeId: grade.id, correctedById: educator.id, percentage: 80, reason: "Clerical fix" })
    ).rejects.toThrow("Permission denied");
  });

  it("Correcting a PROVISIONAL Final Grade is rejected", async () => {
    const { moduleOfferings } = await createOfferingSetup(["Compiler Design"]);
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    await createSystemSettings(50);

    const grade = await prisma.finalGrade.create({
      data: {
        moduleOfferingId: moduleOfferings[0].id,
        studentId: student.id,
        percentage: 70,
        isPassing: true,
        status: "PROVISIONAL",
        releasedById: admin.id,
      },
    });
    createdFinalGradeIds.push(grade.id);

    await expect(
      correctFinalGrade({ finalGradeId: grade.id, correctedById: admin.id, percentage: 80, reason: "Clerical fix" })
    ).rejects.toThrow("Released");
  });
});
