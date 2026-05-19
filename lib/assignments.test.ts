import { describe, it, expect, afterEach } from "vitest";
import {
  createAssignment,
  publishAssignment,
  unpublishAssignment,
  listAssignments,
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

async function cleanup() {
  if (createdEnrollmentIds.length) {
    await prisma.enrollment.deleteMany({ where: { id: { in: [...createdEnrollmentIds] } } });
    createdEnrollmentIds.length = 0;
  }
  if (createdAssignmentIds.length) {
    await prisma.assignment.deleteMany({ where: { id: { in: [...createdAssignmentIds] } } });
    createdAssignmentIds.length = 0;
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
