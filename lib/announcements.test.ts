import { describe, it, expect, afterEach } from "vitest";
import { createAnnouncement, listActiveAnnouncements, listAllAnnouncements } from "./announcements";
import { createFaculty, createCourse, createModule, createIntake, createStudyMode } from "./catalogue";
import { createCurriculumTemplate, addAcademicLevel, addTemplateModule } from "./curriculum-template";
import { createCourseOfferingFromTemplate } from "./course-offering";
import { enrollStudent } from "./enrollment";
import { prisma } from "./prisma";
import type { UserRole } from "./generated/prisma/enums";

// ── cleanup tracking ─────────────────────────────────────────────────────────

const createdAnnouncementIds: string[] = [];
const createdNotificationIds: string[] = [];
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
  if (createdNotificationIds.length) {
    await prisma.notification.deleteMany({ where: { id: { in: [...createdNotificationIds] } } });
    createdNotificationIds.length = 0;
  }
  if (createdAnnouncementIds.length) {
    await prisma.announcement.deleteMany({ where: { id: { in: [...createdAnnouncementIds] } } });
    createdAnnouncementIds.length = 0;
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
    await prisma.notification.deleteMany({ where: { recipientId: { in: uaIds } } });
    await prisma.auditLogEntry.deleteMany({ where: { actorId: { in: uaIds } } });
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

// ── createAnnouncement — permission checks ────────────────────────────────────

describe("createAnnouncement — institution scope", () => {
  afterEach(cleanup);

  it("Super Administrator can create an institution-scoped announcement", async () => {
    const superAdmin = await createTestUserAccount("SUPER_ADMINISTRATOR");

    const announcement = await createAnnouncement({
      createdById: superAdmin.id,
      scope: "INSTITUTION",
      body: "<p>Important notice for everyone.</p>",
    });

    createdAnnouncementIds.push(announcement.id);
    expect(announcement.scope).toBe("INSTITUTION");
    expect(announcement.body).toBe("<p>Important notice for everyone.</p>");
    expect(announcement.createdById).toBe(superAdmin.id);
    expect(announcement.expiresAt).toBeNull();
  });

  it("Administrator can create an institution-scoped announcement", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");

    const announcement = await createAnnouncement({
      createdById: admin.id,
      scope: "INSTITUTION",
      body: "<p>Admin announcement.</p>",
    });

    createdAnnouncementIds.push(announcement.id);
    expect(announcement.scope).toBe("INSTITUTION");
  });

  it("Educator cannot create an institution-scoped announcement", async () => {
    const educator = await createTestUserAccount("EDUCATOR");

    await expect(
      createAnnouncement({ createdById: educator.id, scope: "INSTITUTION", body: "<p>Hello</p>" })
    ).rejects.toThrow(/permission/i);
  });

  it("Student cannot create any announcement", async () => {
    const student = await createTestUserAccount("STUDENT");

    await expect(
      createAnnouncement({ createdById: student.id, scope: "INSTITUTION", body: "<p>Hello</p>" })
    ).rejects.toThrow(/permission/i);
  });
});

describe("createAnnouncement — course offering scope", () => {
  afterEach(cleanup);

  it("Administrator can create a course-offering-scoped announcement", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering } = await createOfferingSetup(["Programming"]);

    const announcement = await createAnnouncement({
      createdById: admin.id,
      scope: "COURSE_OFFERING",
      courseOfferingId: offering.id,
      body: "<p>Course notice.</p>",
    });

    createdAnnouncementIds.push(announcement.id);
    expect(announcement.scope).toBe("COURSE_OFFERING");
    expect(announcement.courseOfferingId).toBe(offering.id);
  });

  it("Educator cannot create a course-offering-scoped announcement", async () => {
    const { offering, educators } = await createOfferingSetup(["Programming"]);

    await expect(
      createAnnouncement({ createdById: educators[0].id, scope: "COURSE_OFFERING", courseOfferingId: offering.id, body: "<p>Hi</p>" })
    ).rejects.toThrow(/permission/i);
  });

  it("course-offering scope requires courseOfferingId", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");

    await expect(
      createAnnouncement({ createdById: admin.id, scope: "COURSE_OFFERING", body: "<p>Hi</p>" })
    ).rejects.toThrow(/courseOfferingId/i);
  });
});

describe("createAnnouncement — module offering scope", () => {
  afterEach(cleanup);

  it("Educator can create a module-offering-scoped announcement for their assigned module", async () => {
    const { moduleOfferings, educators } = await createOfferingSetup(["Programming"]);

    const announcement = await createAnnouncement({
      createdById: educators[0].id,
      scope: "MODULE_OFFERING",
      moduleOfferingId: moduleOfferings[0].id,
      body: "<p>Module notice.</p>",
    });

    createdAnnouncementIds.push(announcement.id);
    expect(announcement.scope).toBe("MODULE_OFFERING");
    expect(announcement.moduleOfferingId).toBe(moduleOfferings[0].id);
  });

  it("Educator cannot create a module-offering announcement for a module they are not assigned to", async () => {
    const { moduleOfferings } = await createOfferingSetup(["Programming"]);
    const otherEducator = await createTestUserAccount("EDUCATOR");

    await expect(
      createAnnouncement({
        createdById: otherEducator.id,
        scope: "MODULE_OFFERING",
        moduleOfferingId: moduleOfferings[0].id,
        body: "<p>Unauthorized.</p>",
      })
    ).rejects.toThrow(/permission/i);
  });

  it("module-offering scope requires moduleOfferingId", async () => {
    const educator = await createTestUserAccount("EDUCATOR");

    await expect(
      createAnnouncement({ createdById: educator.id, scope: "MODULE_OFFERING", body: "<p>Hi</p>" })
    ).rejects.toThrow(/moduleOfferingId/i);
  });
});

// ── body sanitization ─────────────────────────────────────────────────────────

describe("createAnnouncement — body sanitization", () => {
  afterEach(cleanup);

  it("strips script tags from the body before storage", async () => {
    const superAdmin = await createTestUserAccount("SUPER_ADMINISTRATOR");

    const announcement = await createAnnouncement({
      createdById: superAdmin.id,
      scope: "INSTITUTION",
      body: '<p>Hello</p><script>alert("xss")</script>',
    });

    createdAnnouncementIds.push(announcement.id);
    expect(announcement.body).not.toContain("<script>");
    expect(announcement.body).toContain("<p>Hello</p>");
  });

  it("strips onclick and other event attributes", async () => {
    const superAdmin = await createTestUserAccount("SUPER_ADMINISTRATOR");

    const announcement = await createAnnouncement({
      createdById: superAdmin.id,
      scope: "INSTITUTION",
      body: '<p onclick="evil()">Click me</p>',
    });

    createdAnnouncementIds.push(announcement.id);
    expect(announcement.body).not.toContain("onclick");
    expect(announcement.body).toContain("Click me");
  });
});

// ── expiry ────────────────────────────────────────────────────────────────────

describe("listActiveAnnouncements — expiry", () => {
  afterEach(cleanup);

  it("returns non-expired institution announcements in the active feed", async () => {
    const superAdmin = await createTestUserAccount("SUPER_ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");

    const announcement = await createAnnouncement({
      createdById: superAdmin.id,
      scope: "INSTITUTION",
      body: "<p>Active.</p>",
      expiresAt: new Date(Date.now() + 86400_000),
    });
    createdAnnouncementIds.push(announcement.id);

    const feed = await listActiveAnnouncements({ viewerId: student.id });
    expect(feed.some((a) => a.id === announcement.id)).toBe(true);
  });

  it("excludes expired announcements from the active feed", async () => {
    const superAdmin = await createTestUserAccount("SUPER_ADMINISTRATOR");
    const student = await createTestUserAccount("STUDENT");

    const expired = await createAnnouncement({
      createdById: superAdmin.id,
      scope: "INSTITUTION",
      body: "<p>Expired.</p>",
      expiresAt: new Date(Date.now() - 1000),
    });
    createdAnnouncementIds.push(expired.id);

    const feed = await listActiveAnnouncements({ viewerId: student.id });
    expect(feed.some((a) => a.id === expired.id)).toBe(false);
  });

  it("listAllAnnouncements includes expired announcements", async () => {
    const superAdmin = await createTestUserAccount("SUPER_ADMINISTRATOR");

    const expired = await createAnnouncement({
      createdById: superAdmin.id,
      scope: "INSTITUTION",
      body: "<p>Expired.</p>",
      expiresAt: new Date(Date.now() - 1000),
    });
    createdAnnouncementIds.push(expired.id);

    const all = await listAllAnnouncements();
    expect(all.some((a) => a.id === expired.id)).toBe(true);
  });
});

// ── notification dispatch ─────────────────────────────────────────────────────

describe("createAnnouncement — notification dispatch", () => {
  afterEach(cleanup);

  it("institution-scoped announcement creates a Notification for every active user account", async () => {
    const superAdmin = await createTestUserAccount("SUPER_ADMINISTRATOR");
    const activeUser1 = await createTestUserAccount("STUDENT");
    const activeUser2 = await createTestUserAccount("EDUCATOR");
    const inactiveUser = await createTestUserAccount("STUDENT", "INACTIVE");

    const announcement = await createAnnouncement({
      createdById: superAdmin.id,
      scope: "INSTITUTION",
      body: "<p>To everyone.</p>",
    });
    createdAnnouncementIds.push(announcement.id);

    const notifications = await prisma.notification.findMany({ where: { announcementId: announcement.id } });
    const recipientIds = notifications.map((n) => n.recipientId);

    expect(recipientIds).toContain(superAdmin.id);
    expect(recipientIds).toContain(activeUser1.id);
    expect(recipientIds).toContain(activeUser2.id);
    expect(recipientIds).not.toContain(inactiveUser.id);
  });

  it("course-offering-scoped announcement creates Notifications for enrolled students and module educators", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, educators } = await createOfferingSetup(["Programming", "Databases"]);

    const student = await createTestUserAccount("STUDENT");
    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const outsideStudent = await createTestUserAccount("STUDENT");

    const announcement = await createAnnouncement({
      createdById: admin.id,
      scope: "COURSE_OFFERING",
      courseOfferingId: offering.id,
      body: "<p>Course notice.</p>",
    });
    createdAnnouncementIds.push(announcement.id);

    const notifications = await prisma.notification.findMany({ where: { announcementId: announcement.id } });
    const recipientIds = notifications.map((n) => n.recipientId);

    expect(recipientIds).toContain(student.id);
    expect(recipientIds).toContain(educators[0].id);
    expect(recipientIds).toContain(educators[1].id);
    expect(recipientIds).not.toContain(outsideStudent.id);
  });

  it("module-offering-scoped announcement notifies students with effective access and the assigned educator", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, moduleOfferings, educators } = await createOfferingSetup(["Programming", "Databases"]);

    const student = await createTestUserAccount("STUDENT");
    const enrollment = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (enrollment.status !== "enrolled") throw new Error("expected enrolled");
    createdEnrollmentIds.push(enrollment.enrollment.id);

    const outsideStudent = await createTestUserAccount("STUDENT");

    const announcement = await createAnnouncement({
      createdById: educators[0].id,
      scope: "MODULE_OFFERING",
      moduleOfferingId: moduleOfferings[0].id,
      body: "<p>Module notice.</p>",
    });
    createdAnnouncementIds.push(announcement.id);

    const notifications = await prisma.notification.findMany({ where: { announcementId: announcement.id } });
    const recipientIds = notifications.map((n) => n.recipientId);

    expect(recipientIds).toContain(student.id);
    expect(recipientIds).toContain(educators[0].id);
    expect(recipientIds).not.toContain(outsideStudent.id);
    expect(recipientIds).not.toContain(educators[1].id);
  });

  it("shared links and attachments are stored with the announcement", async () => {
    const superAdmin = await createTestUserAccount("SUPER_ADMINISTRATOR");

    const announcement = await createAnnouncement({
      createdById: superAdmin.id,
      scope: "INSTITUTION",
      body: "<p>See links.</p>",
      sharedLinks: [
        { url: "https://example.com/resource", title: "Resource" },
        { url: "https://example.com/other" },
      ],
    });
    createdAnnouncementIds.push(announcement.id);

    const stored = await prisma.announcement.findUniqueOrThrow({
      where: { id: announcement.id },
      include: { sharedLinks: true },
    });
    expect(stored.sharedLinks).toHaveLength(2);
    expect(stored.sharedLinks.find((l) => l.title === "Resource")).toBeDefined();
    expect(stored.sharedLinks.find((l) => l.url === "https://example.com/other")).toBeDefined();
  });
});
