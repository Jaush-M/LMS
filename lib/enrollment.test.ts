import { describe, it, expect, afterEach } from "vitest";
import {
  calculateEffectiveModuleAccess,
  enrollStudent,
  createModuleEnrollmentException,
  setMainEnrollment,
  previewEnrollmentCsvImport,
  commitEnrollmentCsvImport,
} from "./enrollment";
import { createFaculty, createCourse, createModule, createIntake, createStudyMode } from "./catalogue";
import { createCurriculumTemplate, addAcademicLevel, addTemplateModule } from "./curriculum-template";
import { createCourseOfferingFromTemplate } from "./course-offering";
import { prisma } from "./prisma";
import type { UserRole } from "./generated/prisma/enums";

// ── cleanup tracking ─────────────────────────────────────────────────────────

const createdEnrollmentIds: string[] = [];
const createdCourseOfferingIds: string[] = [];
const createdTemplateIds: string[] = [];
const createdCourseIds: string[] = [];
const createdFacultyIds: string[] = [];
const createdModuleIds: string[] = [];
const createdIntakeIds: string[] = [];
const createdStudyModeIds: string[] = [];
const createdUserIds: string[] = [];

async function cleanup() {
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
    await prisma.auditLogEntry.deleteMany({ where: { actorId: { in: [...createdUserIds] } } });
    await prisma.userAccount.deleteMany({ where: { userId: { in: [...createdUserIds] } } });
    await prisma.account.deleteMany({ where: { userId: { in: [...createdUserIds] } } });
    await prisma.user.deleteMany({ where: { id: { in: [...createdUserIds] } } });
    createdUserIds.length = 0;
  }
}

// ── test helpers ─────────────────────────────────────────────────────────────

let seq = 0;
function uniqueCode(prefix: string) {
  return `${prefix}${Date.now()}${++seq}`;
}

async function createTestUserAccount(role: UserRole) {
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
          status: "ACTIVE",
          mustChangePassword: false,
        },
      },
    },
  });
  createdUserIds.push(userId);
  return prisma.userAccount.findUniqueOrThrow({ where: { userId } });
}

async function createOfferingSetup(moduleNames: string[], capacity = 24) {
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

  const educator = await createTestUserAccount("EDUCATOR");
  const templateModules = [];
  for (const [index, moduleName] of moduleNames.entries()) {
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
    capacity,
    moduleOfferings: templateModules.map((tm) => ({ templateModuleId: tm.id, primaryEducatorId: educator.id })),
  });
  createdCourseOfferingIds.push(offering.id);

  const moduleOfferings = await prisma.moduleOffering.findMany({
    where: { courseOfferingId: offering.id },
    orderBy: { templateModule: { sortOrder: "asc" } },
  });

  return { offering, moduleOfferings };
}

// ── calculateEffectiveModuleAccess ───────────────────────────────────────────

describe("calculateEffectiveModuleAccess", () => {
  it("returns all active module offerings when there are no exceptions", () => {
    const moduleOfferings = [{ id: "mo-1" }, { id: "mo-2" }, { id: "mo-3" }];
    const result = calculateEffectiveModuleAccess(moduleOfferings, []);
    expect(result.map((mo) => mo.id)).toEqual(["mo-1", "mo-2", "mo-3"]);
  });

  it("removes module offerings that have an EXCLUDE exception", () => {
    const moduleOfferings = [{ id: "mo-1" }, { id: "mo-2" }, { id: "mo-3" }];
    const exceptions = [{ moduleOfferingId: "mo-2", exceptionType: "EXCLUDE" as const }];
    const result = calculateEffectiveModuleAccess(moduleOfferings, exceptions);
    expect(result.map((mo) => mo.id)).toEqual(["mo-1", "mo-3"]);
  });

  it("adds module offerings with an INCLUDE exception even if not in the active set", () => {
    const moduleOfferings = [{ id: "mo-1" }, { id: "mo-2" }];
    const exceptions = [{ moduleOfferingId: "mo-extra", exceptionType: "INCLUDE" as const }];
    const result = calculateEffectiveModuleAccess(moduleOfferings, exceptions);
    expect(result.map((mo) => mo.id)).toEqual(["mo-1", "mo-2", "mo-extra"]);
  });
});

// ── enrollStudent ─────────────────────────────────────────────────────────────

describe("enrollStudent", () => {
  afterEach(cleanup);

  it("creates an enrollment for a valid student", async () => {
    const { offering } = await createOfferingSetup(["Programming"]);
    const student = await createTestUserAccount("STUDENT");
    const admin = await createTestUserAccount("ADMINISTRATOR");

    const result = await enrollStudent({
      studentId: student.id,
      courseOfferingId: offering.id,
      enrolledById: admin.id,
    });

    expect(result.status).toBe("enrolled");
    if (result.status !== "enrolled") return;
    createdEnrollmentIds.push(result.enrollment.id);

    expect(result.enrollment.studentId).toBe(student.id);
    expect(result.enrollment.courseOfferingId).toBe(offering.id);
    expect(result.enrollment.isMainEnrollment).toBe(false);
    expect(result.enrollment.enrollmentStatus).toBe("ACTIVE");
  });

  it("rejects enrollment of a non-student account", async () => {
    const { offering } = await createOfferingSetup(["Programming"]);
    const educator = await createTestUserAccount("EDUCATOR");
    const admin = await createTestUserAccount("ADMINISTRATOR");

    await expect(
      enrollStudent({ studentId: educator.id, courseOfferingId: offering.id, enrolledById: admin.id })
    ).rejects.toThrow(/student/i);
  });

  it("rejects a duplicate active enrollment for the same student and course offering", async () => {
    const { offering } = await createOfferingSetup(["Programming"]);
    const student = await createTestUserAccount("STUDENT");
    const admin = await createTestUserAccount("ADMINISTRATOR");

    const first = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (first.status === "enrolled") createdEnrollmentIds.push(first.enrollment.id);

    await expect(
      enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id })
    ).rejects.toThrow(/already enrolled/i);
  });

  it("returns capacity_exceeded when enrollment count reaches capacity and no override is provided", async () => {
    const { offering } = await createOfferingSetup(["Programming"], 1);
    const student1 = await createTestUserAccount("STUDENT");
    const student2 = await createTestUserAccount("STUDENT");
    const admin = await createTestUserAccount("ADMINISTRATOR");

    const first = await enrollStudent({ studentId: student1.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (first.status === "enrolled") createdEnrollmentIds.push(first.enrollment.id);

    const result = await enrollStudent({ studentId: student2.id, courseOfferingId: offering.id, enrolledById: admin.id });
    expect(result.status).toBe("capacity_exceeded");
    if (result.status !== "capacity_exceeded") return;
    expect(result.currentCount).toBe(1);
    expect(result.capacity).toBe(1);
  });

  it("creates enrollment with CapacityOverride and audit log when override reason is provided", async () => {
    const { offering } = await createOfferingSetup(["Programming"], 1);
    const student1 = await createTestUserAccount("STUDENT");
    const student2 = await createTestUserAccount("STUDENT");
    const admin = await createTestUserAccount("ADMINISTRATOR");

    const first = await enrollStudent({ studentId: student1.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (first.status === "enrolled") createdEnrollmentIds.push(first.enrollment.id);

    const result = await enrollStudent({
      studentId: student2.id,
      courseOfferingId: offering.id,
      enrolledById: admin.id,
      capacityOverride: { reason: "Special case approved by head of department" },
    });

    expect(result.status).toBe("enrolled");
    if (result.status !== "enrolled") return;
    createdEnrollmentIds.push(result.enrollment.id);

    const override = await prisma.capacityOverride.findUnique({ where: { enrollmentId: result.enrollment.id } });
    expect(override).not.toBeNull();
    expect(override?.reason).toBe("Special case approved by head of department");

    const auditEntry = await prisma.auditLogEntry.findFirst({
      where: { entityId: result.enrollment.id, action: "CAPACITY_OVERRIDE" },
    });
    expect(auditEntry).not.toBeNull();
  });

  it("marks the enrollment as main when isMainEnrollment is true", async () => {
    const { offering } = await createOfferingSetup(["Programming"]);
    const student = await createTestUserAccount("STUDENT");
    const admin = await createTestUserAccount("ADMINISTRATOR");

    const result = await enrollStudent({
      studentId: student.id,
      courseOfferingId: offering.id,
      enrolledById: admin.id,
      isMainEnrollment: true,
    });

    expect(result.status).toBe("enrolled");
    if (result.status !== "enrolled") return;
    createdEnrollmentIds.push(result.enrollment.id);
    expect(result.enrollment.isMainEnrollment).toBe(true);
  });

  it("unmarks the previous main enrollment when a new one is set as main", async () => {
    const { offering: offering1 } = await createOfferingSetup(["Programming"]);
    const { offering: offering2 } = await createOfferingSetup(["Databases"]);
    const student = await createTestUserAccount("STUDENT");
    const admin = await createTestUserAccount("ADMINISTRATOR");

    const first = await enrollStudent({
      studentId: student.id,
      courseOfferingId: offering1.id,
      enrolledById: admin.id,
      isMainEnrollment: true,
    });
    if (first.status === "enrolled") createdEnrollmentIds.push(first.enrollment.id);

    const second = await enrollStudent({
      studentId: student.id,
      courseOfferingId: offering2.id,
      enrolledById: admin.id,
      isMainEnrollment: true,
    });
    if (second.status === "enrolled") createdEnrollmentIds.push(second.enrollment.id);

    if (first.status !== "enrolled" || second.status !== "enrolled") return;

    const updatedFirst = await prisma.enrollment.findUniqueOrThrow({ where: { id: first.enrollment.id } });
    expect(updatedFirst.isMainEnrollment).toBe(false);
    expect(second.enrollment.isMainEnrollment).toBe(true);
  });
});

// ── CSV enrollment import ───────────────────────────────────────────────────

describe("previewEnrollmentCsvImport", () => {
  afterEach(cleanup);

  it("previews valid rows and validation errors without creating enrollments", async () => {
    const { offering } = await createOfferingSetup(["Programming"]);
    const student = await createTestUserAccount("STUDENT");

    const preview = await previewEnrollmentCsvImport({
      courseOfferingId: offering.id,
      csvText: [
        "Student Identifier,Institutional Email,Name",
        `${student.generatedIdentifier},,Existing Student`,
        ",not-an-email,Bad Email",
        ",,Missing Identifier",
      ].join("\n"),
    });

    expect(preview.totalRows).toBe(3);
    expect(preview.validRows).toEqual([
      {
        rowNumber: 2,
        studentIdentifier: student.generatedIdentifier,
        institutionalEmail: student.institutionalEmail,
        name: "Existing Student",
        action: "match_existing",
        studentId: student.id,
      },
    ]);
    expect(preview.invalidRows).toEqual([
      {
        rowNumber: 3,
        studentIdentifier: null,
        institutionalEmail: "not-an-email",
        name: "Bad Email",
        errors: ["Institutional Email must be a valid email address"],
      },
      {
        rowNumber: 4,
        studentIdentifier: null,
        institutionalEmail: null,
        name: "Missing Identifier",
        errors: ["Student Identifier or Institutional Email is required"],
      },
    ]);

    await expect(prisma.enrollment.count({ where: { courseOfferingId: offering.id } })).resolves.toBe(0);
  });

  it("matches by Institutional Email, rejects duplicate enrollment, and previews optional account creation", async () => {
    const { offering } = await createOfferingSetup(["Programming"]);
    const enrolledStudent = await createTestUserAccount("STUDENT");
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const enrollment = await enrollStudent({
      studentId: enrolledStudent.id,
      courseOfferingId: offering.id,
      enrolledById: admin.id,
    });
    if (enrollment.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const preview = await previewEnrollmentCsvImport({
      courseOfferingId: offering.id,
      createMissingAccounts: true,
      csvText: [
        "Student Identifier,Institutional Email,Name",
        `,${enrolledStudent.institutionalEmail.toUpperCase()},Already Enrolled`,
        ",new.student@example.edu.mv,New Student",
      ].join("\n"),
    });

    expect(preview.validRows).toEqual([
      {
        rowNumber: 3,
        studentIdentifier: null,
        institutionalEmail: "new.student@example.edu.mv",
        name: "New Student",
        action: "create_account",
        studentId: null,
      },
    ]);
    expect(preview.invalidRows).toEqual([
      {
        rowNumber: 2,
        studentIdentifier: null,
        institutionalEmail: enrolledStudent.institutionalEmail.toLowerCase(),
        name: "Already Enrolled",
        errors: ["Student is already enrolled in this Course Offering"],
      },
    ]);
  });
});

describe("commitEnrollmentCsvImport", () => {
  afterEach(cleanup);

  it("enrolls matched Students, creates missing Student accounts when allowed, and skips invalid rows", async () => {
    const { offering } = await createOfferingSetup(["Programming"]);
    const existingStudent = await createTestUserAccount("STUDENT");
    const admin = await createTestUserAccount("ADMINISTRATOR");

    const result = await commitEnrollmentCsvImport({
      courseOfferingId: offering.id,
      enrolledById: admin.id,
      createMissingAccounts: true,
      csvText: [
        "Student Identifier,Institutional Email,Name",
        `${existingStudent.generatedIdentifier},,Existing Student`,
        ",new.student@example.edu.mv,New Student",
        ",invalid-email,Invalid Student",
      ].join("\n"),
    });
    createdEnrollmentIds.push(...result.enrolledRows.map((row) => row.enrollmentId));
    createdUserIds.push(...result.createdAccounts.map((account) => account.userId));

    expect(result.enrolledRows).toHaveLength(2);
    expect(result.enrolledRows.map((row) => row.rowNumber)).toEqual([2, 3]);
    expect(result.createdAccounts).toHaveLength(1);
    expect(result.createdAccounts[0]).toMatchObject({
      rowNumber: 3,
      name: "New Student",
      role: "STUDENT",
    });
    expect(result.skippedRows).toEqual([
      {
        rowNumber: 4,
        studentIdentifier: null,
        institutionalEmail: "invalid-email",
        name: "Invalid Student",
        errors: ["Institutional Email must be a valid email address"],
      },
    ]);

    const enrollments = await prisma.enrollment.findMany({
      where: { courseOfferingId: offering.id },
      include: { student: true },
      orderBy: { createdAt: "asc" },
    });
    expect(enrollments).toHaveLength(2);
    expect(enrollments.map((enrollment) => enrollment.studentId)).toContain(existingStudent.id);
    expect(enrollments.map((enrollment) => enrollment.student.role)).toEqual(["STUDENT", "STUDENT"]);
  });
});

// ── createModuleEnrollmentException ─────────────────────────────────────────

describe("createModuleEnrollmentException", () => {
  afterEach(cleanup);

  it("creates an EXCLUDE exception with a reason", async () => {
    const { offering, moduleOfferings } = await createOfferingSetup(["Programming", "Databases"]);
    const student = await createTestUserAccount("STUDENT");
    const admin = await createTestUserAccount("ADMINISTRATOR");

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const exception = await createModuleEnrollmentException({
      enrollmentId: enrollment.enrollment.id,
      moduleOfferingId: moduleOfferings[0].id,
      exceptionType: "EXCLUDE",
      reason: "Student transferred to a different track",
      createdById: admin.id,
    });

    expect(exception.exceptionType).toBe("EXCLUDE");
    expect(exception.reason).toBe("Student transferred to a different track");
    expect(exception.moduleOfferingId).toBe(moduleOfferings[0].id);
  });

  it("creates an INCLUDE exception with a reason", async () => {
    const { offering, moduleOfferings } = await createOfferingSetup(["Programming", "Databases"]);
    const student = await createTestUserAccount("STUDENT");
    const admin = await createTestUserAccount("ADMINISTRATOR");

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const exception = await createModuleEnrollmentException({
      enrollmentId: enrollment.enrollment.id,
      moduleOfferingId: moduleOfferings[1].id,
      exceptionType: "INCLUDE",
      reason: "Student needs access to advanced content",
      createdById: admin.id,
    });

    expect(exception.exceptionType).toBe("INCLUDE");
    expect(exception.moduleOfferingId).toBe(moduleOfferings[1].id);
  });

  it("rejects a duplicate exception for the same enrollment and module offering", async () => {
    const { offering, moduleOfferings } = await createOfferingSetup(["Programming"]);
    const student = await createTestUserAccount("STUDENT");
    const admin = await createTestUserAccount("ADMINISTRATOR");

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    await createModuleEnrollmentException({
      enrollmentId: enrollment.enrollment.id,
      moduleOfferingId: moduleOfferings[0].id,
      exceptionType: "EXCLUDE",
      reason: "First exception",
      createdById: admin.id,
    });

    await expect(
      createModuleEnrollmentException({
        enrollmentId: enrollment.enrollment.id,
        moduleOfferingId: moduleOfferings[0].id,
        exceptionType: "INCLUDE",
        reason: "Duplicate attempt",
        createdById: admin.id,
      })
    ).rejects.toThrow(/already exists/i);
  });

  it("rejects an exception whose module offering belongs to a different course offering", async () => {
    const { offering: offering1 } = await createOfferingSetup(["Programming"]);
    const { moduleOfferings: otherModuleOfferings } = await createOfferingSetup(["Databases"]);
    const student = await createTestUserAccount("STUDENT");
    const admin = await createTestUserAccount("ADMINISTRATOR");

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering1.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    await expect(
      createModuleEnrollmentException({
        enrollmentId: enrollment.enrollment.id,
        moduleOfferingId: otherModuleOfferings[0].id,
        exceptionType: "EXCLUDE",
        reason: "Wrong offering",
        createdById: admin.id,
      })
    ).rejects.toThrow(/course offering/i);
  });
});

// ── setMainEnrollment ────────────────────────────────────────────────────────

describe("setMainEnrollment", () => {
  afterEach(cleanup);

  it("marks the target enrollment as main and clears any previous main enrollment for that student", async () => {
    const { offering: offering1 } = await createOfferingSetup(["Programming"]);
    const { offering: offering2 } = await createOfferingSetup(["Databases"]);
    const student = await createTestUserAccount("STUDENT");
    const admin = await createTestUserAccount("ADMINISTRATOR");

    const first = await enrollStudent({ studentId: student.id, courseOfferingId: offering1.id, enrolledById: admin.id, isMainEnrollment: true });
    const second = await enrollStudent({ studentId: student.id, courseOfferingId: offering2.id, enrolledById: admin.id });
    if (first.status !== "enrolled" || second.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(first.enrollment.id, second.enrollment.id);

    await setMainEnrollment(second.enrollment.id);

    const updatedFirst = await prisma.enrollment.findUniqueOrThrow({ where: { id: first.enrollment.id } });
    const updatedSecond = await prisma.enrollment.findUniqueOrThrow({ where: { id: second.enrollment.id } });
    expect(updatedFirst.isMainEnrollment).toBe(false);
    expect(updatedSecond.isMainEnrollment).toBe(true);
  });
});
