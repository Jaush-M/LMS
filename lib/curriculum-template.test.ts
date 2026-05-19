import { describe, it, expect, afterEach } from "vitest";
import {
  createCurriculumTemplate,
  getCurriculumTemplate,
  markCurriculumTemplateActive,
  markCurriculumTemplateInactive,
  addAcademicLevel,
  editAcademicLevel,
  removeAcademicLevel,
  addTemplateModule,
  editTemplateModule,
  removeTemplateModule,
  addPrerequisite,
  removePrerequisite,
  addDefaultAssessmentComponent,
  removeDefaultAssessmentComponent,
  checkCreditWarning,
} from "./curriculum-template";
import { prisma } from "./prisma";
import { createFaculty, createCourse, createModule, markModuleInactive } from "./catalogue";

// ── helpers ───────────────────────────────────────────────────────────────

const createdTemplateIds: string[] = [];
const createdCourseIds: string[] = [];
const createdFacultyIds: string[] = [];
const createdModuleIds: string[] = [];

async function cleanup() {
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
}

let _seq = 0;
function uniqueCode(prefix: string) {
  return `${prefix}${Date.now()}${++_seq}`;
}

async function makeCourse() {
  const faculty = await createFaculty({ name: `Faculty-${uniqueCode("F")}` });
  createdFacultyIds.push(faculty.id);
  const course = await createCourse({
    code: uniqueCode("CRS"),
    name: "Test Course",
    awardLevel: "DEGREE",
    facultyId: faculty.id,
  });
  createdCourseIds.push(course.id);
  return course;
}

async function makeModule() {
  const mod = await createModule({ code: uniqueCode("MOD"), name: "Test Module" });
  createdModuleIds.push(mod.id);
  return mod;
}

// ── createCurriculumTemplate ──────────────────────────────────────────────

describe("createCurriculumTemplate", () => {
  afterEach(cleanup);

  it("creates a curriculum template with ACTIVE status", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    expect(template.courseId).toBe(course.id);
    expect(template.status).toBe("ACTIVE");
  });

  it("throws when the course already has a curriculum template", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    await expect(createCurriculumTemplate(course.id)).rejects.toThrow();
  });
});

// ── markCurriculumTemplateInactive / markCurriculumTemplateActive ──────────

describe("markCurriculumTemplateInactive", () => {
  afterEach(cleanup);

  it("transitions a curriculum template to INACTIVE", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    const updated = await markCurriculumTemplateInactive(template.id);
    expect(updated.status).toBe("INACTIVE");
  });

  it("throws when curriculum template is already inactive", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    await markCurriculumTemplateInactive(template.id);
    await expect(markCurriculumTemplateInactive(template.id)).rejects.toThrow();
  });
});

describe("markCurriculumTemplateActive", () => {
  afterEach(cleanup);

  it("transitions a curriculum template back to ACTIVE", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    await markCurriculumTemplateInactive(template.id);
    const updated = await markCurriculumTemplateActive(template.id);
    expect(updated.status).toBe("ACTIVE");
  });

  it("throws when curriculum template is already active", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    await expect(markCurriculumTemplateActive(template.id)).rejects.toThrow();
  });
});

// ── addAcademicLevel ──────────────────────────────────────────────────────

describe("addAcademicLevel", () => {
  afterEach(cleanup);

  it("adds an academic level with label and sort order", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1 });
    expect(level.label).toBe("Year 1");
    expect(level.sortOrder).toBe(1);
    expect(level.expectedCredits).toBeNull();
  });

  it("stores optional expected credits", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    const level = await addAcademicLevel(template.id, { label: "Semester 1", sortOrder: 1, expectedCredits: 120 });
    expect(level.expectedCredits).toBe(120);
  });
});

// ── editAcademicLevel ─────────────────────────────────────────────────────

describe("editAcademicLevel", () => {
  afterEach(cleanup);

  it("updates label, sort order, and expected credits", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1, expectedCredits: 100 });
    const updated = await editAcademicLevel(level.id, { label: "Year 2", sortOrder: 2, expectedCredits: 120 });
    expect(updated.label).toBe("Year 2");
    expect(updated.sortOrder).toBe(2);
    expect(updated.expectedCredits).toBe(120);
  });

  it("can clear expected credits", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1, expectedCredits: 120 });
    const updated = await editAcademicLevel(level.id, { expectedCredits: null });
    expect(updated.expectedCredits).toBeNull();
  });
});

// ── removeAcademicLevel ───────────────────────────────────────────────────

describe("removeAcademicLevel", () => {
  afterEach(cleanup);

  it("removes the academic level and cascades its template modules", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1 });
    const mod = await makeModule();
    await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: mod.id, credits: 15, sortOrder: 1 });

    await removeAcademicLevel(level.id);

    const levelFound = await prisma.academicLevel.findUnique({ where: { id: level.id } });
    expect(levelFound).toBeNull();
    const tmFound = await prisma.templateModule.findFirst({ where: { academicLevelId: level.id } });
    expect(tmFound).toBeNull();
  });
});

// ── addTemplateModule ─────────────────────────────────────────────────────

describe("addTemplateModule", () => {
  afterEach(cleanup);

  it("adds a template module with credits and sort order", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1 });
    const mod = await makeModule();
    const tm = await addTemplateModule(template.id, {
      academicLevelId: level.id,
      moduleId: mod.id,
      credits: 15,
      sortOrder: 1,
    });
    expect(tm.moduleId).toBe(mod.id);
    expect(tm.credits).toBe(15);
    expect(tm.sortOrder).toBe(1);
  });

  it("throws when the module is inactive", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1 });
    const mod = await makeModule();
    await markModuleInactive(mod.id);
    await expect(
      addTemplateModule(template.id, { academicLevelId: level.id, moduleId: mod.id, credits: 15, sortOrder: 1 })
    ).rejects.toThrow(/inactive/i);
  });
});

// ── editTemplateModule ────────────────────────────────────────────────────

describe("editTemplateModule", () => {
  afterEach(cleanup);

  it("updates credits and sort order", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1 });
    const mod = await makeModule();
    const tm = await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: mod.id, credits: 15, sortOrder: 1 });
    const updated = await editTemplateModule(tm.id, { credits: 20, sortOrder: 2 });
    expect(updated.credits).toBe(20);
    expect(updated.sortOrder).toBe(2);
  });
});

// ── removeTemplateModule ──────────────────────────────────────────────────

describe("removeTemplateModule", () => {
  afterEach(cleanup);

  it("removes the template module", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1 });
    const mod = await makeModule();
    const tm = await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: mod.id, credits: 15, sortOrder: 1 });
    await removeTemplateModule(tm.id);
    const found = await prisma.templateModule.findUnique({ where: { id: tm.id } });
    expect(found).toBeNull();
  });
});

// ── addPrerequisite / removePrerequisite ──────────────────────────────────

describe("addPrerequisite", () => {
  afterEach(cleanup);

  it("links two template modules as prerequisite within the same template", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1 });
    const modA = await makeModule();
    const modB = await makeModule();
    const tmA = await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: modA.id, credits: 15, sortOrder: 1 });
    const tmB = await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: modB.id, credits: 15, sortOrder: 2 });
    await addPrerequisite(tmB.id, tmA.id);
    const link = await prisma.templateModulePrerequisite.findUnique({
      where: { templateModuleId_prerequisiteId: { templateModuleId: tmB.id, prerequisiteId: tmA.id } },
    });
    expect(link).not.toBeNull();
  });

  it("throws when the prerequisite belongs to a different template", async () => {
    const courseA = await makeCourse();
    const courseB = await makeCourse();
    const templateA = await createCurriculumTemplate(courseA.id);
    const templateB = await createCurriculumTemplate(courseB.id);
    createdTemplateIds.push(templateA.id, templateB.id);
    const levelA = await addAcademicLevel(templateA.id, { label: "Year 1", sortOrder: 1 });
    const levelB = await addAcademicLevel(templateB.id, { label: "Year 1", sortOrder: 1 });
    const modA = await makeModule();
    const modB = await makeModule();
    const tmA = await addTemplateModule(templateA.id, { academicLevelId: levelA.id, moduleId: modA.id, credits: 15, sortOrder: 1 });
    const tmB = await addTemplateModule(templateB.id, { academicLevelId: levelB.id, moduleId: modB.id, credits: 15, sortOrder: 1 });
    await expect(addPrerequisite(tmB.id, tmA.id)).rejects.toThrow(/cross-template/i);
  });
});

describe("removePrerequisite", () => {
  afterEach(cleanup);

  it("removes a prerequisite link", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1 });
    const modA = await makeModule();
    const modB = await makeModule();
    const tmA = await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: modA.id, credits: 15, sortOrder: 1 });
    const tmB = await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: modB.id, credits: 15, sortOrder: 2 });
    await addPrerequisite(tmB.id, tmA.id);
    await removePrerequisite(tmB.id, tmA.id);
    const link = await prisma.templateModulePrerequisite.findUnique({
      where: { templateModuleId_prerequisiteId: { templateModuleId: tmB.id, prerequisiteId: tmA.id } },
    });
    expect(link).toBeNull();
  });
});

// ── addDefaultAssessmentComponent ─────────────────────────────────────────

describe("addDefaultAssessmentComponent", () => {
  afterEach(cleanup);

  it("adds a default assessment component with type, weight, and maximum mark", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1 });
    const mod = await makeModule();
    const tm = await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: mod.id, credits: 15, sortOrder: 1 });
    const comp = await addDefaultAssessmentComponent(tm.id, {
      title: "Final Exam",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 60,
      maximumMark: 100,
    });
    expect(comp.title).toBe("Final Exam");
    expect(comp.type).toBe("OFFLINE_ASSESSMENT");
    expect(comp.weightPercent).toBe(60);
    expect(comp.maximumMark).toBe(100);
  });
});

// ── removeDefaultAssessmentComponent ─────────────────────────────────────

describe("removeDefaultAssessmentComponent", () => {
  afterEach(cleanup);

  it("removes a default assessment component", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1 });
    const mod = await makeModule();
    const tm = await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: mod.id, credits: 15, sortOrder: 1 });
    const comp = await addDefaultAssessmentComponent(tm.id, {
      title: "Assignment 1",
      type: "ONLINE_ASSIGNMENT",
      weightPercent: 40,
      maximumMark: 50,
    });
    await removeDefaultAssessmentComponent(comp.id);
    const found = await prisma.defaultAssessmentComponent.findUnique({ where: { id: comp.id } });
    expect(found).toBeNull();
  });
});

// ── checkCreditWarning ────────────────────────────────────────────────────

describe("checkCreditWarning", () => {
  afterEach(cleanup);

  it("returns null when level total credits equal the expected credits", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1, expectedCredits: 30 });
    const modA = await makeModule();
    const modB = await makeModule();
    await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: modA.id, credits: 15, sortOrder: 1 });
    await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: modB.id, credits: 15, sortOrder: 2 });
    const warning = await checkCreditWarning(level.id);
    expect(warning).toBeNull();
  });

  it("returns { total, expected } when they differ", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1, expectedCredits: 120 });
    const mod = await makeModule();
    await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: mod.id, credits: 15, sortOrder: 1 });
    const warning = await checkCreditWarning(level.id);
    expect(warning).toEqual({ total: 15, expected: 120 });
  });

  it("defaults to 120 as expected credits when none is set on the level", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1 });
    const mod = await makeModule();
    await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: mod.id, credits: 15, sortOrder: 1 });
    const warning = await checkCreditWarning(level.id);
    expect(warning).toEqual({ total: 15, expected: 120 });
  });
});

// ── getCurriculumTemplate ─────────────────────────────────────────────────

describe("getCurriculumTemplate", () => {
  afterEach(cleanup);

  it("returns template with nested levels, modules, prerequisites, and default assessment components", async () => {
    const course = await makeCourse();
    const template = await createCurriculumTemplate(course.id);
    createdTemplateIds.push(template.id);
    const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1, expectedCredits: 30 });
    const modA = await makeModule();
    const modB = await makeModule();
    const tmA = await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: modA.id, credits: 15, sortOrder: 1 });
    const tmB = await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: modB.id, credits: 15, sortOrder: 2 });
    await addPrerequisite(tmB.id, tmA.id);
    await addDefaultAssessmentComponent(tmA.id, {
      title: "Final Exam",
      type: "OFFLINE_ASSESSMENT",
      weightPercent: 100,
      maximumMark: 100,
    });

    const result = await getCurriculumTemplate(template.id);

    expect(result.id).toBe(template.id);
    expect(result.academicLevels).toHaveLength(1);
    const resultLevel = result.academicLevels[0];
    expect(resultLevel.label).toBe("Year 1");
    expect(resultLevel.templateModules).toHaveLength(2);

    const resultTmA = resultLevel.templateModules.find((m) => m.id === tmA.id)!;
    expect(resultTmA.defaultAssessmentComponents).toHaveLength(1);
    expect(resultTmA.defaultAssessmentComponents[0].title).toBe("Final Exam");

    const resultTmB = resultLevel.templateModules.find((m) => m.id === tmB.id)!;
    expect(resultTmB.prerequisites).toHaveLength(1);
    expect(resultTmB.prerequisites[0].prerequisiteId).toBe(tmA.id);
  });
});
