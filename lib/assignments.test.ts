import { describe, it, expect, afterEach } from "vitest";
import {
  createAssignment,
  publishAssignment,
  unpublishAssignment,
  listAssignments,
  submitAssignment,
  listSubmissions,
  extendDeadline,
  getEffectiveDeadline,
} from "./assignments";
import { enrollStudent } from "./enrollment";
import { createFaculty, createCourse, createModule, createIntake, createStudyMode } from "./catalogue";
import { createCurriculumTemplate, addAcademicLevel, addTemplateModule } from "./curriculum-template";
import { createCourseOfferingFromTemplate } from "./course-offering";
import { prisma } from "./prisma";
import type { UserRole } from "./generated/prisma/enums";

// ── cleanup tracking ──────────────────────────────────────────────────────────

const createdAssignmentIds: string[] = [];
const createdContentSectionIds: string[] = [];
const createdCourseOfferingIds: string[] = [];
const createdTemplateIds: string[] = [];
const createdCourseIds: string[] = [];
const createdFacultyIds: string[] = [];
const createdModuleIds: string[] = [];
const createdIntakeIds: string[] = [];
const createdStudyModeIds: string[] = [];
const createdUserIds: string[] = [];
const createdEnrollmentIds: string[] = [];
const createdFileAssetIds: string[] = [];
const createdDeadlineExtensionIds: string[] = [];

async function cleanup() {
  if (createdDeadlineExtensionIds.length) {
    await prisma.assignmentDeadlineExtension.deleteMany({ where: { id: { in: [...createdDeadlineExtensionIds] } } });
    createdDeadlineExtensionIds.length = 0;
  }
  if (createdEnrollmentIds.length) {
    await prisma.enrollment.deleteMany({ where: { id: { in: [...createdEnrollmentIds] } } });
    createdEnrollmentIds.length = 0;
  }
  if (createdAssignmentIds.length) {
    // submissions cascade-delete with assignments
    await prisma.assignment.deleteMany({ where: { id: { in: [...createdAssignmentIds] } } });
    createdAssignmentIds.length = 0;
  }
  if (createdFileAssetIds.length) {
    await prisma.fileAsset.deleteMany({ where: { id: { in: [...createdFileAssetIds] } } });
    createdFileAssetIds.length = 0;
  }
  if (createdContentSectionIds.length) {
    await prisma.contentSection.deleteMany({ where: { id: { in: [...createdContentSectionIds] } } });
    createdContentSectionIds.length = 0;
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
    await prisma.notification.deleteMany({ where: { recipientId: { in: uaIds } } });
    await prisma.auditLogEntry.deleteMany({ where: { actorId: { in: uaIds } } });
    await prisma.userAccount.deleteMany({ where: { userId: { in: [...createdUserIds] } } });
    await prisma.account.deleteMany({ where: { userId: { in: [...createdUserIds] } } });
    await prisma.user.deleteMany({ where: { id: { in: [...createdUserIds] } } });
    createdUserIds.length = 0;
  }
}

// ── test helpers ──────────────────────────────────────────────────────────────

let seq = 0;
function uniqueCode(prefix: string) {
  return `${prefix}${Date.now()}${++seq}`;
}

async function createTestFileAsset(uploadedById: string) {
  const asset = await prisma.fileAsset.create({
    data: {
      storageDriver: "local",
      storageKey: `submission-${uniqueCode("key")}`,
      originalFilename: "submission.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1 * 1024 * 1024,
      category: "SUBMISSION",
      uploadedById,
    },
  });
  createdFileAssetIds.push(asset.id);
  return asset;
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

// ── createAssignment ──────────────────────────────────────────────────────────

describe("createAssignment — body sanitization", () => {
  afterEach(cleanup);

  it("strips script tags from the body before storage", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "XSS Test",
      body: '<p>Hello</p><script>alert("xss")</script>',
      deadline: new Date("2026-12-01T10:00:00.000Z"),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);

    expect(assignment.body).not.toContain("<script>");
    expect(assignment.body).toContain("<p>Hello</p>");
  });
});

describe("createAssignment — permissions", () => {
  afterEach(cleanup);

  it("Educator cannot create an Assignment for a Module Offering they are not assigned to", async () => {
    const { moduleOfferings } = await createOfferingSetup(["Programming"]);
    const otherEducator = await createTestUserAccount("EDUCATOR");

    await expect(
      createAssignment({
        moduleOfferingId: moduleOfferings[0].id,
        createdById: otherEducator.id,
        title: "Unauthorized",
        body: "<p>Nope.</p>",
        deadline: new Date("2026-12-01T10:00:00.000Z"),
        maximumMark: 100,
      })
    ).rejects.toThrow(/permission/i);
  });

  it("Student cannot create an Assignment", async () => {
    const { moduleOfferings } = await createOfferingSetup(["Programming"]);
    const student = await createTestUserAccount("STUDENT");

    await expect(
      createAssignment({
        moduleOfferingId: moduleOfferings[0].id,
        createdById: student.id,
        title: "Student Attempt",
        body: "<p>Nope.</p>",
        deadline: new Date("2026-12-01T10:00:00.000Z"),
        maximumMark: 100,
      })
    ).rejects.toThrow(/permission/i);
  });
});

describe("createAssignment — file attachments", () => {
  afterEach(cleanup);

  it("rejects a file attachment exceeding 25 MB", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const oversizedFile = await prisma.fileAsset.create({
      data: {
        storageDriver: "local",
        storageKey: `test-${uniqueCode("key")}`,
        originalFilename: "bigfile.pdf",
        mimeType: "application/pdf",
        sizeBytes: 26 * 1024 * 1024,
        category: "ASSIGNMENT_ATTACHMENT",
        uploadedById: educators[0].id,
      },
    });

    await expect(
      createAssignment({
        moduleOfferingId: moduleOfferings[0].id,
        createdById: educators[0].id,
        title: "Oversized",
        body: "<p>Too big.</p>",
        deadline: new Date("2026-12-01T10:00:00.000Z"),
        maximumMark: 100,
        fileAssetIds: [oversizedFile.id],
      })
    ).rejects.toThrow(/25 MB|size limit/i);

    await prisma.fileAsset.delete({ where: { id: oversizedFile.id } });
  });
});

describe("createAssignment — shared links", () => {
  afterEach(cleanup);

  it("stores shared links on the Assignment", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Assignment with Links",
      body: "<p>See resources below.</p>",
      deadline: new Date("2026-12-01T10:00:00.000Z"),
      maximumMark: 50,
      sharedLinks: [
        { url: "https://example.com/resource1", title: "Resource 1" },
        { url: "https://example.com/resource2" },
      ],
    });
    createdAssignmentIds.push(assignment.id);

    const stored = await prisma.assignment.findUniqueOrThrow({
      where: { id: assignment.id },
      include: { sharedLinks: true },
    });

    expect(stored.sharedLinks).toHaveLength(2);
    expect(stored.sharedLinks.some((l) => l.url === "https://example.com/resource1" && l.title === "Resource 1")).toBe(true);
    expect(stored.sharedLinks.some((l) => l.url === "https://example.com/resource2" && l.title === null)).toBe(true);
  });
});

describe("createAssignment — Content Section link", () => {
  afterEach(cleanup);

  it("Assignment can be optionally linked to a Content Section", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const section = await prisma.contentSection.create({
      data: {
        moduleOfferingId: moduleOfferings[0].id,
        createdById: educators[0].id,
        title: "Week 1",
        sortOrder: 1,
      },
    });
    createdContentSectionIds.push(section.id);

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Linked Assignment",
      body: "<p>Found in Week 1 section.</p>",
      deadline: new Date("2026-12-01T10:00:00.000Z"),
      maximumMark: 100,
      contentSectionId: section.id,
    });
    createdAssignmentIds.push(assignment.id);

    expect(assignment.contentSectionId).toBe(section.id);
  });

  it("Content Section link is optional — assignment without a Content Section is valid", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Standalone Assignment",
      body: "<p>No section link.</p>",
      deadline: new Date("2026-12-01T10:00:00.000Z"),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);

    expect(assignment.contentSectionId).toBeNull();
  });
});

describe("createAssignment", () => {
  afterEach(cleanup);

  it("Educator can create an Assignment for their assigned Module Offering", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);
    const deadline = new Date("2026-12-01T10:00:00.000Z");

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Assignment 1: Introduction",
      body: "<p>Write a program that prints Hello World.</p>",
      deadline,
      maximumMark: 100,
    });

    createdAssignmentIds.push(assignment.id);
    expect(assignment.title).toBe("Assignment 1: Introduction");
    expect(assignment.body).toBe("<p>Write a program that prints Hello World.</p>");
    expect(assignment.deadline).toEqual(deadline);
    expect(assignment.maximumMark).toBe(100);
    expect(assignment.status).toBe("DRAFT");
    expect(assignment.moduleOfferingId).toBe(moduleOfferings[0].id);
  });
});

// ── publishAssignment / listAssignments ───────────────────────────────────────

describe("publishAssignment", () => {
  afterEach(cleanup);

  it("Educator can publish a Draft Assignment; it becomes visible to enrolled Students with Effective Module Access", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const { offering, moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Published Assignment",
      body: "<p>Now visible.</p>",
      deadline: new Date("2026-12-01T10:00:00.000Z"),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);

    await publishAssignment({ id: assignment.id, publishedById: educators[0].id });

    const result = await listAssignments({ moduleOfferingId: moduleOfferings[0].id, viewerId: student.id });
    expect(result.some((a) => a.id === assignment.id)).toBe(true);
  });

  it("Draft Assignment is not visible to a Student", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const { offering, moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Draft Assignment",
      body: "<p>Hidden.</p>",
      deadline: new Date("2026-12-01T10:00:00.000Z"),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);

    const result = await listAssignments({ moduleOfferingId: moduleOfferings[0].id, viewerId: student.id });
    expect(result.some((a) => a.id === assignment.id)).toBe(false);
  });

  it("Draft Assignment is visible to the assigned Educator", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Draft Assignment",
      body: "<p>Visible to educator.</p>",
      deadline: new Date("2026-12-01T10:00:00.000Z"),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);

    const result = await listAssignments({ moduleOfferingId: moduleOfferings[0].id, viewerId: educators[0].id });
    expect(result.some((a) => a.id === assignment.id)).toBe(true);
  });

  it("Publishing dispatches notifications to enrolled Students with Effective Module Access", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const outsideStudent = await createTestUserAccount("STUDENT");
    const { offering, moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Notification Assignment",
      body: "<p>Notify enrolled students.</p>",
      deadline: new Date("2026-12-01T10:00:00.000Z"),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);

    await publishAssignment({ id: assignment.id, publishedById: educators[0].id });

    const notifications = await prisma.notification.findMany({ where: { assignmentId: assignment.id } });
    const recipientIds = notifications.map((n) => n.recipientId);

    expect(recipientIds).toContain(student.id);
    expect(recipientIds).not.toContain(outsideStudent.id);
  });

  it("Student without Effective Module Access cannot list Assignments", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);
    const outsideStudent = await createTestUserAccount("STUDENT");

    await expect(
      listAssignments({ moduleOfferingId: moduleOfferings[0].id, viewerId: outsideStudent.id })
    ).rejects.toThrow(/access/i);
  });
});

// ── unpublishAssignment ───────────────────────────────────────────────────────

describe("unpublishAssignment", () => {
  afterEach(cleanup);

  it("Educator can unpublish a Published Assignment; it becomes hidden from Students again", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const { offering, moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Toggle Assignment",
      body: "<p>Toggle test.</p>",
      deadline: new Date("2026-12-01T10:00:00.000Z"),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);

    await publishAssignment({ id: assignment.id, publishedById: educators[0].id });
    await unpublishAssignment({ id: assignment.id, unpublishedById: educators[0].id });

    const result = await listAssignments({ moduleOfferingId: moduleOfferings[0].id, viewerId: student.id });
    expect(result.some((a) => a.id === assignment.id)).toBe(false);
  });
});

// ── listSubmissions ───────────────────────────────────────────────────────────

describe("listSubmissions", () => {
  afterEach(cleanup);

  it("Educator sees the active submission for each Student on their Assignment", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const { offering, moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "List Submissions",
      body: "<p>Submit here.</p>",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);
    await publishAssignment({ id: assignment.id, publishedById: educators[0].id });

    const file1 = await createTestFileAsset(student.id);
    await submitAssignment({ assignmentId: assignment.id, studentId: student.id, fileAssetId: file1.id });
    const file2 = await createTestFileAsset(student.id);
    await submitAssignment({ assignmentId: assignment.id, studentId: student.id, fileAssetId: file2.id });

    const submissions = await listSubmissions({ assignmentId: assignment.id, viewerId: educators[0].id });

    expect(submissions).toHaveLength(1);
    expect(submissions[0].studentId).toBe(student.id);
    expect(submissions[0].fileAssetId).toBe(file2.id);
  });
});

// ── submitAssignment ──────────────────────────────────────────────────────────

describe("submitAssignment", () => {
  afterEach(cleanup);

  it("Student submits again before deadline — active submission is replaced, status stays SUBMITTED", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const { offering, moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Replace Test",
      body: "<p>Replace this.</p>",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);
    await publishAssignment({ id: assignment.id, publishedById: educators[0].id });

    const file1 = await createTestFileAsset(student.id);
    await submitAssignment({ assignmentId: assignment.id, studentId: student.id, fileAssetId: file1.id });

    const file2 = await createTestFileAsset(student.id);
    const replaced = await submitAssignment({ assignmentId: assignment.id, studentId: student.id, fileAssetId: file2.id });

    expect(replaced.fileAssetId).toBe(file2.id);
    expect(replaced.status).toBe("SUBMITTED");

    const all = await prisma.assignmentSubmission.findMany({ where: { assignmentId: assignment.id, studentId: student.id } });
    expect(all).toHaveLength(1);
  });

  it("Student cannot submit to a Draft (unpublished) Assignment", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const { offering, moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Draft Assignment",
      body: "<p>Not yet published.</p>",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);

    const file = await createTestFileAsset(student.id);
    await expect(
      submitAssignment({ assignmentId: assignment.id, studentId: student.id, fileAssetId: file.id })
    ).rejects.toThrow(/published/i);
  });

  it("Student without Effective Module Access cannot submit", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);
    const outsideStudent = await createTestUserAccount("STUDENT");

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Access Denied",
      body: "<p>Not for you.</p>",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);
    await publishAssignment({ id: assignment.id, publishedById: educators[0].id });

    const file = await createTestFileAsset(outsideStudent.id);
    await expect(
      submitAssignment({ assignmentId: assignment.id, studentId: outsideStudent.id, fileAssetId: file.id })
    ).rejects.toThrow(/access/i);
  });

  it("Marked submission cannot be replaced by the Student", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const { offering, moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Marked Submission",
      body: "<p>Already marked.</p>",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);
    await publishAssignment({ id: assignment.id, publishedById: educators[0].id });

    const file1 = await createTestFileAsset(student.id);
    await prisma.assignmentSubmission.create({
      data: { assignmentId: assignment.id, studentId: student.id, fileAssetId: file1.id, status: "MARKED", submittedAt: new Date() },
    });

    const file2 = await createTestFileAsset(student.id);
    await expect(
      submitAssignment({ assignmentId: assignment.id, studentId: student.id, fileAssetId: file2.id })
    ).rejects.toThrow(/marked/i);
  });

  it("Student cannot replace a submission after the deadline", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const { offering, moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Post-Deadline Replace",
      body: "<p>Past due.</p>",
      deadline: new Date(Date.now() - 24 * 60 * 60 * 1000),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);
    await publishAssignment({ id: assignment.id, publishedById: educators[0].id });

    const file1 = await createTestFileAsset(student.id);
    // Inject an existing SUBMITTED submission (simulating a pre-deadline submission by writing directly)
    await prisma.assignmentSubmission.create({
      data: { assignmentId: assignment.id, studentId: student.id, fileAssetId: file1.id, status: "SUBMITTED", submittedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    });

    const file2 = await createTestFileAsset(student.id);
    await expect(
      submitAssignment({ assignmentId: assignment.id, studentId: student.id, fileAssetId: file2.id })
    ).rejects.toThrow(/deadline/i);
  });

  it("Student submits after deadline with no prior submission — status is LATE", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const { offering, moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Late Submission Test",
      body: "<p>Overdue.</p>",
      deadline: new Date(Date.now() - 24 * 60 * 60 * 1000),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);
    await publishAssignment({ id: assignment.id, publishedById: educators[0].id });

    const file = await createTestFileAsset(student.id);
    const submission = await submitAssignment({ assignmentId: assignment.id, studentId: student.id, fileAssetId: file.id });

    expect(submission.status).toBe("LATE");
  });

  it("Student with Effective Module Access submits before deadline — status is SUBMITTED", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const { offering, moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Submit Test",
      body: "<p>Submit this.</p>",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);
    await publishAssignment({ id: assignment.id, publishedById: educators[0].id });

    const file = await createTestFileAsset(student.id);
    const submission = await submitAssignment({ assignmentId: assignment.id, studentId: student.id, fileAssetId: file.id });

    expect(submission.status).toBe("SUBMITTED");
    expect(submission.assignmentId).toBe(assignment.id);
    expect(submission.studentId).toBe(student.id);
    expect(submission.fileAssetId).toBe(file.id);
  });
});

// ── extendDeadline ────────────────────────────────────────────────────────────

describe("extendDeadline", () => {
  afterEach(cleanup);

  it("educator extends deadline — extension record created and audit logged", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);
    const educator = educators[0];

    const originalDeadline = new Date("2026-12-01T10:00:00.000Z");
    const extendedDeadline = new Date("2026-12-03T10:00:00.000Z");

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educator.id,
      title: "Extended Test",
      body: "<p>Submit this.</p>",
      deadline: originalDeadline,
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);

    const result = await extendDeadline({
      assignmentId: assignment.id,
      extendedById: educator.id,
      newDeadline: extendedDeadline,
      reason: "Additional time needed",
    });

    createdDeadlineExtensionIds.push(result.extension.id);

    expect(result.extension.assignmentId).toBe(assignment.id);
    expect(result.extension.oldDeadline).toEqual(originalDeadline);
    expect(result.extension.newDeadline).toEqual(extendedDeadline);
    expect(result.extension.reason).toBe("Additional time needed");
    expect(result.extension.createdById).toBe(educator.id);

    expect(result.auditEntry.entityType).toBe("Assignment");
    expect(result.auditEntry.entityId).toBe(assignment.id);
    expect(result.auditEntry.action).toBe("DEADLINE_EXTENDED");
    expect(result.auditEntry.actorId).toBe(educator.id);
    expect(result.auditEntry.reason).toBe("Additional time needed");
  });
});

// ── getEffectiveDeadline ──────────────────────────────────────────────────────

describe("getEffectiveDeadline", () => {
  afterEach(cleanup);

  it("returns base deadline when no extensions exist", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);
    const educator = educators[0];

    const baseDeadline = new Date("2026-12-01T10:00:00.000Z");
    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educator.id,
      title: "No Extension",
      body: "<p>Test.</p>",
      deadline: baseDeadline,
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);

    const effective = await getEffectiveDeadline(assignment.id);
    expect(effective).toEqual(baseDeadline);
  });

  it("returns latest extended deadline after multiple extensions", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);
    const educator = educators[0];

    const baseDeadline = new Date("2026-12-01T10:00:00.000Z");
    const firstExtension = new Date("2026-12-03T10:00:00.000Z");
    const secondExtension = new Date("2026-12-05T10:00:00.000Z");

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educator.id,
      title: "Multiple Extensions",
      body: "<p>Test.</p>",
      deadline: baseDeadline,
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);

    const ext1 = await extendDeadline({
      assignmentId: assignment.id,
      extendedById: educator.id,
      newDeadline: firstExtension,
      reason: "First extension",
    });
    createdDeadlineExtensionIds.push(ext1.extension.id);

    const ext2 = await extendDeadline({
      assignmentId: assignment.id,
      extendedById: educator.id,
      newDeadline: secondExtension,
      reason: "Second extension",
    });
    createdDeadlineExtensionIds.push(ext2.extension.id);

    const effective = await getEffectiveDeadline(assignment.id);
    expect(effective).toEqual(secondExtension);
  });
});

// ── submitAssignment with effective deadline ─────────────────────────────────

describe("submitAssignment with extended deadline", () => {
  afterEach(cleanup);

  it("submission after original deadline but within extension is SUBMITTED, not LATE", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);
    const educator = educators[0];
    const student = await createTestUserAccount("STUDENT");

    const baseDeadline = new Date("2026-11-15T10:00:00.000Z");
    const extendedDeadline = new Date("2026-12-01T10:00:00.000Z");
    const submitTime = new Date("2026-11-20T10:00:00.000Z");

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educator.id,
      title: "Extended Deadline Submission",
      body: "<p>Submit this.</p>",
      deadline: baseDeadline,
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);
    await publishAssignment({ id: assignment.id, publishedById: educator.id });

    const admin = await createTestUserAccount("ADMINISTRATOR");
    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: moduleOfferings[0].courseOfferingId, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    await extendDeadline({
      assignmentId: assignment.id,
      extendedById: educator.id,
      newDeadline: extendedDeadline,
      reason: "Extra time granted",
    });

    vi.setSystemTime(submitTime);
    const file = await createTestFileAsset(student.id);
    const submission = await submitAssignment({ assignmentId: assignment.id, studentId: student.id, fileAssetId: file.id });
    vi.useRealTimers();

    expect(submission.status).toBe("SUBMITTED");
  });

  it("extending deadline recalculates LATE submissions to SUBMITTED when within new deadline", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);
    const educator = educators[0];
    const student = await createTestUserAccount("STUDENT");

    const baseDeadline = new Date("2026-11-15T10:00:00.000Z");
    const extendedDeadline = new Date("2026-12-01T10:00:00.000Z");
    const lateSubmissionTime = new Date("2026-11-20T10:00:00.000Z");

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educator.id,
      title: "Retroactive Recalculation",
      body: "<p>Submit this.</p>",
      deadline: baseDeadline,
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);
    await publishAssignment({ id: assignment.id, publishedById: educator.id });

    const admin = await createTestUserAccount("ADMINISTRATOR");
    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: moduleOfferings[0].courseOfferingId, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    vi.setSystemTime(lateSubmissionTime);
    const file = await createTestFileAsset(student.id);
    const lateSubmission = await submitAssignment({ assignmentId: assignment.id, studentId: student.id, fileAssetId: file.id });
    vi.useRealTimers();

    expect(lateSubmission.status).toBe("LATE");

    const result = await extendDeadline({
      assignmentId: assignment.id,
      extendedById: educator.id,
      newDeadline: extendedDeadline,
      reason: "Extra time granted",
    });
    createdDeadlineExtensionIds.push(result.extension.id);

    const updated = await prisma.assignmentSubmission.findUniqueOrThrow({ where: { id: lateSubmission.id } });
    expect(updated.status).toBe("SUBMITTED");
  });

  it("extending deadline does not change MARKED submissions", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);
    const educator = educators[0];
    const student = await createTestUserAccount("STUDENT");

    const baseDeadline = new Date("2026-11-15T10:00:00.000Z");
    const extendedDeadline = new Date("2026-12-01T10:00:00.000Z");
    const submissionTime = new Date("2026-11-10T10:00:00.000Z");

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educator.id,
      title: "Marked Submission Protected",
      body: "<p>Submit this.</p>",
      deadline: baseDeadline,
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);
    await publishAssignment({ id: assignment.id, publishedById: educator.id });

    const admin = await createTestUserAccount("ADMINISTRATOR");
    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: moduleOfferings[0].courseOfferingId, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    vi.setSystemTime(submissionTime);
    const file = await createTestFileAsset(student.id);
    const submission = await submitAssignment({ assignmentId: assignment.id, studentId: student.id, fileAssetId: file.id });
    vi.useRealTimers();

    await prisma.assignmentSubmission.update({ where: { id: submission.id }, data: { status: "MARKED" } });

    const result = await extendDeadline({
      assignmentId: assignment.id,
      extendedById: educator.id,
      newDeadline: extendedDeadline,
      reason: "Extra time granted",
    });
    createdDeadlineExtensionIds.push(result.extension.id);

    const updated = await prisma.assignmentSubmission.findUniqueOrThrow({ where: { id: submission.id } });
    expect(updated.status).toBe("MARKED");
  });
});

// ── extendDeadline notifications ──────────────────────────────────────────────

describe("extendDeadline notifications", () => {
  afterEach(cleanup);

  it("deadline extension notifies students with effective module access", async () => {
    const { moduleOfferings, educators, offering } = await createOfferingSetup(["Programming"]);
    const educator = educators[0];
    const student1 = await createTestUserAccount("STUDENT");
    const student2 = await createTestUserAccount("STUDENT");

    const admin = await createTestUserAccount("ADMINISTRATOR");
    const enroll1 = await enrollStudent({ studentId: student1.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enroll1.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll1.enrollment.id);
    const enroll2 = await enrollStudent({ studentId: student2.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enroll2.status !== "enrolled") throw new Error("Expected enrolled");
    createdEnrollmentIds.push(enroll2.enrollment.id);

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educator.id,
      title: "Notification Test",
      body: "<p>Test.</p>",
      deadline: new Date("2026-12-01T10:00:00.000Z"),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);
    await publishAssignment({ id: assignment.id, publishedById: educator.id });

    const beforeCount = await prisma.notification.count({
      where: { assignmentId: assignment.id },
    });

    const result = await extendDeadline({
      assignmentId: assignment.id,
      extendedById: educator.id,
      newDeadline: new Date("2026-12-05T10:00:00.000Z"),
      reason: "Extra time granted",
    });
    createdDeadlineExtensionIds.push(result.extension.id);

    const afterNotifications = await prisma.notification.findMany({
      where: { assignmentId: assignment.id, title: "Assignment Deadline Extended" },
      select: { recipientId: true, title: true },
    });

    const notifiedIds = afterNotifications.map((n) => n.recipientId);
    expect(notifiedIds).toContain(student1.id);
    expect(notifiedIds).toContain(student2.id);
    expect(afterNotifications).toHaveLength(2);
  });
});

// ── extendDeadline permissions ───────────────────────────────────────────────

describe("extendDeadline permissions", () => {
  afterEach(cleanup);

  it("Student cannot extend deadline", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);
    const educator = educators[0];
    const student = await createTestUserAccount("STUDENT");

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educator.id,
      title: "Permission Test",
      body: "<p>Test.</p>",
      deadline: new Date("2026-12-01T10:00:00.000Z"),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);

    await expect(
      extendDeadline({
        assignmentId: assignment.id,
        extendedById: student.id,
        newDeadline: new Date("2026-12-05T10:00:00.000Z"),
        reason: "Should not work",
      })
    ).rejects.toThrow(/permission/i);
  });

  it("Educator not assigned to the Module Offering cannot extend deadline", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);
    const otherEducator = await createTestUserAccount("EDUCATOR");

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Permission Test",
      body: "<p>Test.</p>",
      deadline: new Date("2026-12-01T10:00:00.000Z"),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);

    await expect(
      extendDeadline({
        assignmentId: assignment.id,
        extendedById: otherEducator.id,
        newDeadline: new Date("2026-12-05T10:00:00.000Z"),
        reason: "Should not work",
      })
    ).rejects.toThrow(/permission/i);
  });

  it("Administrator can extend deadline even if not the creating educator", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);
    const educator = educators[0];
    const admin = await createTestUserAccount("ADMINISTRATOR");

    const assignment = await createAssignment({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educator.id,
      title: "Admin Extension",
      body: "<p>Test.</p>",
      deadline: new Date("2026-12-01T10:00:00.000Z"),
      maximumMark: 100,
    });
    createdAssignmentIds.push(assignment.id);

    const result = await extendDeadline({
      assignmentId: assignment.id,
      extendedById: admin.id,
      newDeadline: new Date("2026-12-05T10:00:00.000Z"),
      reason: "Admin approved extension",
    });
    createdDeadlineExtensionIds.push(result.extension.id);

    expect(result.extension.newDeadline).toEqual(new Date("2026-12-05T10:00:00.000Z"));
  });
});
