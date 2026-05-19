import { describe, it, expect, afterEach } from "vitest";
import { createCourseOfferingFromTemplate } from "./course-offering";
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

async function cleanup() {
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
