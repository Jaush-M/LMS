import { describe, it, expect, afterEach } from "vitest";
import { createCourseOfferingFromTemplate, archiveCourseOffering, isInMarkingWindow, bulkArchiveCourseOfferings } from "./course-offering";
import { createFaculty, createCourse, createModule, createIntake, createStudyMode } from "./catalogue";
import { createCurriculumTemplate, addAcademicLevel, addTemplateModule } from "./curriculum-template";
import { prisma } from "./prisma";
import type { UserRole } from "./generated/prisma/enums";

const createdCourseOfferingIds: string[] = [];
const createdTemplateIds: string[] = [];
const createdCourseIds: string[] = [];
const createdFacultyIds: string[] = [];
const createdModuleIds: string[] = [];
const createdIntakeIds: string[] = [];
const createdStudyModeIds: string[] = [];
const createdUserIds: string[] = [];
let createdSystemSettingsId: string | null = null;

async function cleanup() {
  if (createdCourseOfferingIds.length) {
    await prisma.moduleGroupChat.deleteMany({ where: { moduleOffering: { courseOfferingId: { in: [...createdCourseOfferingIds] } } } });
    await prisma.moduleOffering.deleteMany({ where: { courseOfferingId: { in: [...createdCourseOfferingIds] } } });
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

async function createEducatorAccount() {
  return createTestUserAccount("EDUCATOR");
}

async function createTemplateSetup(moduleNames: string[]) {
  const faculty = await createFaculty({ name: `Faculty ${uniqueCode("F")}` });
  createdFacultyIds.push(faculty.id);
  const course = await createCourse({
    code: uniqueCode("CRS"),
    name: "Software Engineering",
    awardLevel: "DEGREE",
    facultyId: faculty.id,
  });
  createdCourseIds.push(course.id);
  const intake = await createIntake({ name: `September ${uniqueCode("I")}` });
  createdIntakeIds.push(intake.id);
  const studyMode = await createStudyMode({ name: `Blended ${uniqueCode("SM")}` });
  createdStudyModeIds.push(studyMode.id);
  const template = await createCurriculumTemplate(course.id);
  createdTemplateIds.push(template.id);
  const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1 });
  const templateModules = [];

  for (const [index, moduleName] of moduleNames.entries()) {
    const mod = await createModule({ code: uniqueCode("MOD"), name: moduleName });
    createdModuleIds.push(mod.id);
    templateModules.push(
      await addTemplateModule(template.id, {
        academicLevelId: level.id,
        moduleId: mod.id,
        credits: 15,
        sortOrder: index + 1,
      })
    );
  }

  return { course, intake, studyMode, template, templateModules };
}

describe("createCourseOfferingFromTemplate", () => {
  afterEach(cleanup);

  it("creates a course offering with module offerings and module group chats from a curriculum template", async () => {
    const { course, intake, studyMode, template, templateModules } = await createTemplateSetup(["Programming", "Databases"]);
    const [templateModuleA, templateModuleB] = templateModules;
    const educatorA = await createEducatorAccount();
    const educatorB = await createEducatorAccount();

    const offering = await createCourseOfferingFromTemplate({
      curriculumTemplateId: template.id,
      intakeId: intake.id,
      studyModeId: studyMode.id,
      name: "Software Engineering September",
      startAt: new Date("2026-09-01T00:00:00.000Z"),
      finishAt: new Date("2027-06-30T00:00:00.000Z"),
      moduleOfferings: [
        { templateModuleId: templateModuleA.id, primaryEducatorId: educatorA.id },
        { templateModuleId: templateModuleB.id, primaryEducatorId: educatorB.id },
      ],
    });
    createdCourseOfferingIds.push(offering.id);

    expect(offering.courseId).toBe(course.id);
    expect(offering.capacity).toBe(24);
    expect(offering.status).toBe("PLANNED");

    const moduleOfferings = await prisma.moduleOffering.findMany({
      where: { courseOfferingId: offering.id },
      orderBy: { templateModule: { sortOrder: "asc" } },
      include: { moduleGroupChat: true },
    });
    expect(moduleOfferings).toHaveLength(2);
    expect(moduleOfferings.map((mo) => mo.templateModuleId)).toEqual([templateModuleA.id, templateModuleB.id]);
    expect(moduleOfferings.map((mo) => mo.primaryEducatorId)).toEqual([educatorA.id, educatorB.id]);
    expect(moduleOfferings.map((mo) => mo.studyModeId)).toEqual([null, null]);
    expect(moduleOfferings.every((mo) => mo.moduleGroupChat !== null)).toBe(true);
  });

  it("requires every template module to have one primary educator assignment", async () => {
    const { intake, studyMode, template, templateModules } = await createTemplateSetup(["Programming", "Databases"]);
    const [templateModuleA] = templateModules;
    const educator = await createEducatorAccount();

    await expect(
      createCourseOfferingFromTemplate({
        curriculumTemplateId: template.id,
        intakeId: intake.id,
        studyModeId: studyMode.id,
        name: "Software Engineering September",
        startAt: new Date("2026-09-01T00:00:00.000Z"),
        finishAt: new Date("2027-06-30T00:00:00.000Z"),
        moduleOfferings: [{ templateModuleId: templateModuleA.id, primaryEducatorId: educator.id }],
      })
    ).rejects.toThrow(/every template module/i);
  });

  it("rejects primary educator assignments to non-educator accounts", async () => {
    const { intake, studyMode, template, templateModules } = await createTemplateSetup(["Programming"]);
    const [templateModule] = templateModules;
    const studentAccount = await createTestUserAccount("STUDENT");

    await expect(
      createCourseOfferingFromTemplate({
        curriculumTemplateId: template.id,
        intakeId: intake.id,
        studyModeId: studyMode.id,
        name: "Software Engineering September",
        startAt: new Date("2026-09-01T00:00:00.000Z"),
        finishAt: new Date("2027-06-30T00:00:00.000Z"),
        moduleOfferings: [{ templateModuleId: templateModule.id, primaryEducatorId: studentAccount.id }],
      })
    ).rejects.toThrow(/educator account/i);
  });
});

// ── archiveCourseOffering ──────────────────────────────────────────────────

describe("archiveCourseOffering", () => {
  afterEach(cleanup);

  async function createFinishedOffering() {
    const { course, intake, studyMode, template, templateModules } = await createTemplateSetup(["Programming"]);
    const [templateModuleA] = templateModules;
    const educatorA = await createEducatorAccount();
    const admin = await createTestUserAccount("ADMINISTRATOR");

    const offering = await createCourseOfferingFromTemplate({
      curriculumTemplateId: template.id,
      intakeId: intake.id,
      studyModeId: studyMode.id,
      name: `Finished Offering ${uniqueCode("O")}`,
      startAt: new Date("2025-09-01T00:00:00.000Z"),
      finishAt: new Date("2026-01-31T00:00:00.000Z"),
      moduleOfferings: [{ templateModuleId: templateModuleA.id, primaryEducatorId: educatorA.id }],
    });
    createdCourseOfferingIds.push(offering.id);

    const moduleOffering = await prisma.moduleOffering.findFirstOrThrow({
      where: { courseOfferingId: offering.id },
      include: { moduleGroupChat: true },
    });

    return { offering, moduleOffering, admin, educatorA };
  }

  it("administrator archives a finished course offering", async () => {
    const { offering, admin } = await createFinishedOffering();

    const result = await archiveCourseOffering({ courseOfferingId: offering.id, archivedById: admin.id });

    expect(result.id).toBe(offering.id);
    expect(result.status).toBe("ARCHIVED");
  });

  it("archiving sets all module offerings to ARCHIVED", async () => {
    const { offering, admin } = await createFinishedOffering();

    await archiveCourseOffering({ courseOfferingId: offering.id, archivedById: admin.id });

    const moduleOfferings = await prisma.moduleOffering.findMany({ where: { courseOfferingId: offering.id } });
    expect(moduleOfferings.every((mo) => mo.status === "ARCHIVED")).toBe(true);
  });

  it("archiving sets module group chats to read-only", async () => {
    const { offering, admin } = await createFinishedOffering();

    await archiveCourseOffering({ courseOfferingId: offering.id, archivedById: admin.id });

    const chats = await prisma.moduleGroupChat.findMany({
      where: { moduleOffering: { courseOfferingId: offering.id } },
    });
    expect(chats.every((c) => c.isReadOnly)).toBe(true);
  });

  it("archiving creates an audit log entry", async () => {
    const { offering, admin } = await createFinishedOffering();

    await archiveCourseOffering({ courseOfferingId: offering.id, archivedById: admin.id });

    const audit = await prisma.auditLogEntry.findFirst({
      where: { entityType: "CourseOffering", entityId: offering.id, action: "COURSE_OFFERING_ARCHIVED" },
    });
    expect(audit).not.toBeNull();
    expect(audit?.actorId).toBe(admin.id);
  });

  it("cannot archive a course offering that is not finished", async () => {
    const { intake, studyMode, template, templateModules } = await createTemplateSetup(["Programming"]);
    const [templateModuleA] = templateModules;
    const educatorA = await createEducatorAccount();
    const admin = await createTestUserAccount("ADMINISTRATOR");

    const offering = await createCourseOfferingFromTemplate({
      curriculumTemplateId: template.id,
      intakeId: intake.id,
      studyModeId: studyMode.id,
      name: `Future Offering ${uniqueCode("O")}`,
      startAt: new Date("2027-09-01T00:00:00.000Z"),
      finishAt: new Date("2028-06-30T00:00:00.000Z"),
      moduleOfferings: [{ templateModuleId: templateModuleA.id, primaryEducatorId: educatorA.id }],
    });
    createdCourseOfferingIds.push(offering.id);

    await expect(
      archiveCourseOffering({ courseOfferingId: offering.id, archivedById: admin.id })
    ).rejects.toThrow(/not finished/i);
  });

  it("cannot archive an already archived course offering", async () => {
    const { offering, admin } = await createFinishedOffering();

    await archiveCourseOffering({ courseOfferingId: offering.id, archivedById: admin.id });

    await expect(
      archiveCourseOffering({ courseOfferingId: offering.id, archivedById: admin.id })
    ).rejects.toThrow(/already archived/i);
  });

  it("non-administrator cannot archive a course offering", async () => {
    const { offering, educatorA } = await createFinishedOffering();

    await expect(
      archiveCourseOffering({ courseOfferingId: offering.id, archivedById: educatorA.id })
    ).rejects.toThrow(/administrator/i);
  });
});

// ── isInMarkingWindow ──────────────────────────────────────────────────────

describe("isInMarkingWindow", () => {
  afterEach(cleanup);

  async function createFinishedOffering() {
    const { intake, studyMode, template, templateModules } = await createTemplateSetup(["Programming"]);
    const [templateModuleA] = templateModules;
    const educatorA = await createEducatorAccount();

    const settings = await prisma.systemSettings.create({ data: {} });
    createdSystemSettingsId = settings.id;

    const offering = await createCourseOfferingFromTemplate({
      curriculumTemplateId: template.id,
      intakeId: intake.id,
      studyModeId: studyMode.id,
      name: `Finished Offering ${uniqueCode("O")}`,
      startAt: new Date("2025-09-01T00:00:00.000Z"),
      finishAt: new Date("2026-01-31T00:00:00.000Z"),
      moduleOfferings: [{ templateModuleId: templateModuleA.id, primaryEducatorId: educatorA.id }],
    });
    createdCourseOfferingIds.push(offering.id);

    return offering;
  }

  it("returns true on the finish date", async () => {
    const offering = await createFinishedOffering();

    const result = await isInMarkingWindow(offering.id, new Date("2026-01-31T00:00:00.000Z"));
    expect(result).toBe(true);
  });

  it("returns true within the 14-day marking window", async () => {
    const offering = await createFinishedOffering();

    const result = await isInMarkingWindow(offering.id, new Date("2026-02-10T00:00:00.000Z"));
    expect(result).toBe(true);
  });

  it("returns true on the last day of the marking window (14 days after finish)", async () => {
    const offering = await createFinishedOffering();

    const result = await isInMarkingWindow(offering.id, new Date("2026-02-14T00:00:00.000Z"));
    expect(result).toBe(true);
  });

  it("returns false after the marking window closes", async () => {
    const offering = await createFinishedOffering();

    const result = await isInMarkingWindow(offering.id, new Date("2026-02-14T00:00:00.001Z"));
    expect(result).toBe(false);
  });

  it("returns false before the course finishes", async () => {
    const offering = await createFinishedOffering();

    const result = await isInMarkingWindow(offering.id, new Date("2026-01-15T00:00:00.000Z"));
    expect(result).toBe(false);
  });
});

// ── bulkArchiveCourseOfferings ─────────────────────────────────────────────

describe("bulkArchiveCourseOfferings", () => {
  afterEach(cleanup);

  async function createMultipleOfferings() {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const settings = await prisma.systemSettings.create({ data: {} });
    createdSystemSettingsId = settings.id;

    const offerings = [];
    const finishDates = [
      new Date("2026-01-31T00:00:00.000Z"),
      new Date("2026-02-15T00:00:00.000Z"),
      new Date("2028-06-30T00:00:00.000Z"),
    ];

    for (const finishAt of finishDates) {
      const { intake, studyMode, template, templateModules } = await createTemplateSetup(["Programming"]);
      const [templateModuleA] = templateModules;
      const educatorA = await createEducatorAccount();

      const offering = await createCourseOfferingFromTemplate({
        curriculumTemplateId: template.id,
        intakeId: intake.id,
        studyModeId: studyMode.id,
        name: `Offering ${uniqueCode("O")}`,
        startAt: new Date("2025-09-01T00:00:00.000Z"),
        finishAt,
        moduleOfferings: [{ templateModuleId: templateModuleA.id, primaryEducatorId: educatorA.id }],
      });
      createdCourseOfferingIds.push(offering.id);
      offerings.push(offering);
    }

    return { admin, finished1: offerings[0], finished2: offerings[1], future: offerings[2] };
  }

  it("archives all eligible finished course offerings and reports per-offering results", async () => {
    const { admin, finished1, finished2, future } = await createMultipleOfferings();

    const result = await bulkArchiveCourseOfferings({
      courseOfferingIds: [finished1.id, finished2.id, future.id],
      archivedById: admin.id,
    });

    expect(result).toHaveLength(3);

    const r1 = result.find((r) => r.courseOfferingId === finished1.id)!;
    expect(r1.archived).toBe(true);

    const r2 = result.find((r) => r.courseOfferingId === finished2.id)!;
    expect(r2.archived).toBe(true);

    const r3 = result.find((r) => r.courseOfferingId === future.id)!;
    expect(r3.archived).toBe(false);
    expect(r3.error).toMatch(/not finished/i);
  });

  it("bulk archive skips already archived offerings without error", async () => {
    const { admin, finished1, finished2 } = await createMultipleOfferings();

    await archiveCourseOffering({ courseOfferingId: finished1.id, archivedById: admin.id });

    const result = await bulkArchiveCourseOfferings({
      courseOfferingIds: [finished1.id, finished2.id],
      archivedById: admin.id,
    });

    const r1 = result.find((r) => r.courseOfferingId === finished1.id)!;
    expect(r1.archived).toBe(false);
    expect(r1.error).toMatch(/already archived/i);

    const r2 = result.find((r) => r.courseOfferingId === finished2.id)!;
    expect(r2.archived).toBe(true);
  });

  it("non-administrator cannot bulk archive", async () => {
    const { finished1 } = await createMultipleOfferings();
    const educator = await createEducatorAccount();

    await expect(
      bulkArchiveCourseOfferings({
        courseOfferingIds: [finished1.id],
        archivedById: educator.id,
      })
    ).rejects.toThrow(/administrator/i);
  });
});
