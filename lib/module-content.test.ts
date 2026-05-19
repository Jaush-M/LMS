import { describe, it, expect, afterEach } from "vitest";
import {
  createContentSection,
  editContentSection,
  deleteContentSection,
  reorderContentSections,
  createModuleContent,
  editModuleContent,
  deleteModuleContent,
  reorderModuleContent,
  publishModuleContent,
  unpublishModuleContent,
  listModuleContent,
} from "./module-content";
import { createFaculty, createCourse, createModule, createIntake, createStudyMode } from "./catalogue";
import { createCurriculumTemplate, addAcademicLevel, addTemplateModule } from "./curriculum-template";
import { createCourseOfferingFromTemplate } from "./course-offering";
import { enrollStudent } from "./enrollment";
import { prisma } from "./prisma";
import type { UserRole } from "./generated/prisma/enums";

// ── cleanup tracking ──────────────────────────────────────────────────────────

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

// ── createContentSection ──────────────────────────────────────────────────────

describe("createContentSection", () => {
  afterEach(cleanup);

  it("Educator can create a Content Section for their assigned Module Offering", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const section = await createContentSection({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Week 1: Introduction",
      sortOrder: 1,
    });

    createdContentSectionIds.push(section.id);
    expect(section.title).toBe("Week 1: Introduction");
    expect(section.moduleOfferingId).toBe(moduleOfferings[0].id);
    expect(section.sortOrder).toBe(1);
  });

  it("Educator cannot create a Content Section for a Module Offering they are not assigned to", async () => {
    const { moduleOfferings } = await createOfferingSetup(["Programming"]);
    const otherEducator = await createTestUserAccount("EDUCATOR");

    await expect(
      createContentSection({
        moduleOfferingId: moduleOfferings[0].id,
        createdById: otherEducator.id,
        title: "Unauthorized Section",
        sortOrder: 1,
      })
    ).rejects.toThrow(/permission/i);
  });

  it("Student cannot create a Content Section", async () => {
    const { moduleOfferings } = await createOfferingSetup(["Programming"]);
    const student = await createTestUserAccount("STUDENT");

    await expect(
      createContentSection({
        moduleOfferingId: moduleOfferings[0].id,
        createdById: student.id,
        title: "Sneaky Section",
        sortOrder: 1,
      })
    ).rejects.toThrow(/permission/i);
  });
});

// ── createModuleContent ───────────────────────────────────────────────────────

describe("createModuleContent", () => {
  afterEach(cleanup);

  it("Educator can create a Module Content Item with title, body, and shared links", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const section = await createContentSection({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Week 1",
      sortOrder: 1,
    });
    createdContentSectionIds.push(section.id);

    const item = await createModuleContent({
      contentSectionId: section.id,
      createdById: educators[0].id,
      title: "Introduction to Variables",
      body: "<p>Variables store values.</p>",
      sortOrder: 1,
      sharedLinks: [{ url: "https://example.com/vars", title: "Variables Guide" }],
    });

    expect(item.title).toBe("Introduction to Variables");
    expect(item.body).toBe("<p>Variables store values.</p>");
    expect(item.status).toBe("DRAFT");
    expect(item.sortOrder).toBe(1);

    const stored = await prisma.moduleContent.findUniqueOrThrow({
      where: { id: item.id },
      include: { sharedLinks: true },
    });
    expect(stored.sharedLinks).toHaveLength(1);
    expect(stored.sharedLinks[0].url).toBe("https://example.com/vars");
    expect(stored.sharedLinks[0].title).toBe("Variables Guide");
  });
});

// ── body sanitization ─────────────────────────────────────────────────────────

describe("createModuleContent — body sanitization", () => {
  afterEach(cleanup);

  it("strips script tags from the body before storage", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);
    const section = await createContentSection({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Week 1",
      sortOrder: 1,
    });
    createdContentSectionIds.push(section.id);

    const item = await createModuleContent({
      contentSectionId: section.id,
      createdById: educators[0].id,
      title: "XSS Test",
      body: '<p>Hello</p><script>alert("xss")</script>',
      sortOrder: 1,
    });

    expect(item.body).not.toContain("<script>");
    expect(item.body).toContain("<p>Hello</p>");
  });

  it("strips iframes from the body", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);
    const section = await createContentSection({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Week 1",
      sortOrder: 1,
    });
    createdContentSectionIds.push(section.id);

    const item = await createModuleContent({
      contentSectionId: section.id,
      createdById: educators[0].id,
      title: "Iframe Test",
      body: '<p>Content</p><iframe src="https://evil.com"></iframe>',
      sortOrder: 1,
    });

    expect(item.body).not.toContain("<iframe");
    expect(item.body).toContain("Content");
  });

  it("strips event attributes from the body", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);
    const section = await createContentSection({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Week 1",
      sortOrder: 1,
    });
    createdContentSectionIds.push(section.id);

    const item = await createModuleContent({
      contentSectionId: section.id,
      createdById: educators[0].id,
      title: "Event Test",
      body: '<p onclick="evil()">Click me</p>',
      sortOrder: 1,
    });

    expect(item.body).not.toContain("onclick");
    expect(item.body).toContain("Click me");
  });
});

// ── draft/publish visibility ──────────────────────────────────────────────────

describe("listModuleContent — draft visibility", () => {
  afterEach(cleanup);

  it("Draft content is not visible to a Student", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const { offering, moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const section = await createContentSection({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Week 1",
      sortOrder: 1,
    });
    createdContentSectionIds.push(section.id);

    await createModuleContent({
      contentSectionId: section.id,
      createdById: educators[0].id,
      title: "Draft Item",
      body: "<p>Draft content.</p>",
      sortOrder: 1,
    });

    const result = await listModuleContent({ moduleOfferingId: moduleOfferings[0].id, viewerId: student.id });
    const allItems = result.flatMap((s) => s.contentItems);
    expect(allItems.some((i) => i.title === "Draft Item")).toBe(false);
  });

  it("Draft content is visible to the assigned Educator", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const section = await createContentSection({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Week 1",
      sortOrder: 1,
    });
    createdContentSectionIds.push(section.id);

    await createModuleContent({
      contentSectionId: section.id,
      createdById: educators[0].id,
      title: "Draft Item",
      body: "<p>Draft content.</p>",
      sortOrder: 1,
    });

    const result = await listModuleContent({ moduleOfferingId: moduleOfferings[0].id, viewerId: educators[0].id });
    const allItems = result.flatMap((s) => s.contentItems);
    expect(allItems.some((i) => i.title === "Draft Item")).toBe(true);
  });

  it("Draft content is visible to an Administrator", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const section = await createContentSection({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Week 1",
      sortOrder: 1,
    });
    createdContentSectionIds.push(section.id);

    await createModuleContent({
      contentSectionId: section.id,
      createdById: educators[0].id,
      title: "Draft Item",
      body: "<p>Draft content.</p>",
      sortOrder: 1,
    });

    const result = await listModuleContent({ moduleOfferingId: moduleOfferings[0].id, viewerId: admin.id });
    const allItems = result.flatMap((s) => s.contentItems);
    expect(allItems.some((i) => i.title === "Draft Item")).toBe(true);
  });
});

// ── publish/unpublish ─────────────────────────────────────────────────────────

describe("publishModuleContent", () => {
  afterEach(cleanup);

  it("Educator can publish a Draft content item, making it visible to Students with Effective Module Access", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const { offering, moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const section = await createContentSection({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Week 1",
      sortOrder: 1,
    });
    createdContentSectionIds.push(section.id);

    const item = await createModuleContent({
      contentSectionId: section.id,
      createdById: educators[0].id,
      title: "Published Item",
      body: "<p>Now visible.</p>",
      sortOrder: 1,
    });

    await publishModuleContent({ id: item.id, publishedById: educators[0].id });

    const result = await listModuleContent({ moduleOfferingId: moduleOfferings[0].id, viewerId: student.id });
    const allItems = result.flatMap((s) => s.contentItems);
    expect(allItems.some((i) => i.title === "Published Item")).toBe(true);
  });

  it("Published content is NOT visible to a Student without Effective Module Access", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const outsideStudent = await createTestUserAccount("STUDENT");
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const section = await createContentSection({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Week 1",
      sortOrder: 1,
    });
    createdContentSectionIds.push(section.id);

    const item = await createModuleContent({
      contentSectionId: section.id,
      createdById: educators[0].id,
      title: "Published Item",
      body: "<p>Visible to enrolled only.</p>",
      sortOrder: 1,
    });
    await publishModuleContent({ id: item.id, publishedById: educators[0].id });

    await expect(
      listModuleContent({ moduleOfferingId: moduleOfferings[0].id, viewerId: outsideStudent.id })
    ).rejects.toThrow(/access/i);
  });

  it("Publishing dispatches notifications to students with Effective Module Access", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const outsideStudent = await createTestUserAccount("STUDENT");
    const { offering, moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const section = await createContentSection({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Week 1",
      sortOrder: 1,
    });
    createdContentSectionIds.push(section.id);

    const item = await createModuleContent({
      contentSectionId: section.id,
      createdById: educators[0].id,
      title: "New Content",
      body: "<p>Learn something new.</p>",
      sortOrder: 1,
    });

    await publishModuleContent({ id: item.id, publishedById: educators[0].id });

    const notifications = await prisma.notification.findMany({ where: { moduleContentId: item.id } });
    const recipientIds = notifications.map((n) => n.recipientId);

    expect(recipientIds).toContain(student.id);
    expect(recipientIds).not.toContain(outsideStudent.id);
  });
});

// ── file attachment size limit ────────────────────────────────────────────────

describe("createModuleContent — file attachment size limit", () => {
  afterEach(cleanup);

  it("rejects a file attachment exceeding 25 MB", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const section = await createContentSection({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Week 1",
      sortOrder: 1,
    });
    createdContentSectionIds.push(section.id);

    const oversizedFile = await prisma.fileAsset.create({
      data: {
        storageDriver: "local",
        storageKey: `test-${uniqueCode("key")}`,
        originalFilename: "bigfile.pdf",
        mimeType: "application/pdf",
        sizeBytes: 26 * 1024 * 1024,
        category: "CONTENT_ATTACHMENT",
        uploadedById: educators[0].id,
      },
    });

    await expect(
      createModuleContent({
        contentSectionId: section.id,
        createdById: educators[0].id,
        title: "Oversized Attachment",
        body: "<p>Too big.</p>",
        sortOrder: 1,
        fileAssetIds: [oversizedFile.id],
      })
    ).rejects.toThrow(/25 MB|size limit/i);

    await prisma.fileAsset.delete({ where: { id: oversizedFile.id } });
  });
});

// ── edit and delete ───────────────────────────────────────────────────────────

describe("editContentSection and deleteContentSection", () => {
  afterEach(cleanup);

  it("Educator can rename a Content Section", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const section = await createContentSection({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Old Title",
      sortOrder: 1,
    });
    createdContentSectionIds.push(section.id);

    const updated = await editContentSection({
      id: section.id,
      editedById: educators[0].id,
      title: "New Title",
    });

    expect(updated.title).toBe("New Title");
  });

  it("Educator can delete a Content Section (cascades to content items)", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const section = await createContentSection({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "To Delete",
      sortOrder: 1,
    });

    await createModuleContent({
      contentSectionId: section.id,
      createdById: educators[0].id,
      title: "Orphaned Item",
      body: "<p>Should be deleted.</p>",
      sortOrder: 1,
    });

    await deleteContentSection({ id: section.id, deletedById: educators[0].id });

    const remaining = await prisma.contentSection.findUnique({ where: { id: section.id } });
    expect(remaining).toBeNull();

    const items = await prisma.moduleContent.findMany({ where: { contentSectionId: section.id } });
    expect(items).toHaveLength(0);
  });
});

// ── reorder ───────────────────────────────────────────────────────────────────

describe("reorderContentSections", () => {
  afterEach(cleanup);

  it("Educator can reorder Content Sections; sort order is persisted", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const s1 = await createContentSection({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Section A",
      sortOrder: 1,
    });
    createdContentSectionIds.push(s1.id);

    const s2 = await createContentSection({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Section B",
      sortOrder: 2,
    });
    createdContentSectionIds.push(s2.id);

    await reorderContentSections({
      moduleOfferingId: moduleOfferings[0].id,
      reorderedById: educators[0].id,
      orderedIds: [s2.id, s1.id],
    });

    const s1After = await prisma.contentSection.findUniqueOrThrow({ where: { id: s1.id } });
    const s2After = await prisma.contentSection.findUniqueOrThrow({ where: { id: s2.id } });

    expect(s2After.sortOrder).toBeLessThan(s1After.sortOrder);
  });
});

describe("reorderModuleContent", () => {
  afterEach(cleanup);

  it("Educator can reorder Module Content Items within a section; sort order is persisted", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const section = await createContentSection({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Week 1",
      sortOrder: 1,
    });
    createdContentSectionIds.push(section.id);

    const i1 = await createModuleContent({
      contentSectionId: section.id,
      createdById: educators[0].id,
      title: "Item A",
      body: "<p>A</p>",
      sortOrder: 1,
    });

    const i2 = await createModuleContent({
      contentSectionId: section.id,
      createdById: educators[0].id,
      title: "Item B",
      body: "<p>B</p>",
      sortOrder: 2,
    });

    await reorderModuleContent({
      contentSectionId: section.id,
      reorderedById: educators[0].id,
      orderedIds: [i2.id, i1.id],
    });

    const i1After = await prisma.moduleContent.findUniqueOrThrow({ where: { id: i1.id } });
    const i2After = await prisma.moduleContent.findUniqueOrThrow({ where: { id: i2.id } });

    expect(i2After.sortOrder).toBeLessThan(i1After.sortOrder);
  });
});

// ── unpublish ─────────────────────────────────────────────────────────────────

describe("unpublishModuleContent", () => {
  afterEach(cleanup);

  it("Educator can unpublish a published content item; it becomes hidden from Students again", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");
    const { offering, moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const section = await createContentSection({
      moduleOfferingId: moduleOfferings[0].id,
      createdById: educators[0].id,
      title: "Week 1",
      sortOrder: 1,
    });
    createdContentSectionIds.push(section.id);

    const item = await createModuleContent({
      contentSectionId: section.id,
      createdById: educators[0].id,
      title: "Toggled Item",
      body: "<p>Toggle test.</p>",
      sortOrder: 1,
    });

    await publishModuleContent({ id: item.id, publishedById: educators[0].id });
    await unpublishModuleContent({ id: item.id, unpublishedById: educators[0].id });

    const result = await listModuleContent({ moduleOfferingId: moduleOfferings[0].id, viewerId: student.id });
    const allItems = result.flatMap((s) => s.contentItems);
    expect(allItems.some((i) => i.title === "Toggled Item")).toBe(false);
  });
});
