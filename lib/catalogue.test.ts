import { describe, it, expect, afterEach } from "vitest";
import {
  createFaculty,
  editFaculty,
  markFacultyInactive,
  listFaculties,
  createCourse,
  editCourse,
  markCourseInactive,
  listCourses,
  createModule,
  editModule,
  markModuleInactive,
  listModules,
  createIntake,
  editIntake,
  markIntakeInactive,
  listIntakes,
  createStudyMode,
  editStudyMode,
  markStudyModeInactive,
  listStudyModes,
  createSessionType,
  editSessionType,
  markSessionTypeInactive,
  listSessionTypes,
} from "./catalogue";
import { prisma } from "./prisma";

// ── helpers ───────────────────────────────────────────────────────────────

const createdFacultyIds: string[] = [];
const createdCourseIds: string[] = [];
const createdModuleIds: string[] = [];
const createdIntakeIds: string[] = [];
const createdStudyModeIds: string[] = [];
const createdSessionTypeIds: string[] = [];

async function cleanup() {
  if (createdCourseIds.length)
    await prisma.course.deleteMany({ where: { id: { in: [...createdCourseIds] } } });
  if (createdFacultyIds.length)
    await prisma.faculty.deleteMany({ where: { id: { in: [...createdFacultyIds] } } });
  if (createdModuleIds.length)
    await prisma.module.deleteMany({ where: { id: { in: [...createdModuleIds] } } });
  if (createdIntakeIds.length)
    await prisma.intake.deleteMany({ where: { id: { in: [...createdIntakeIds] } } });
  if (createdStudyModeIds.length)
    await prisma.studyMode.deleteMany({ where: { id: { in: [...createdStudyModeIds] } } });
  if (createdSessionTypeIds.length)
    await prisma.sessionType.deleteMany({ where: { id: { in: [...createdSessionTypeIds] } } });
  createdFacultyIds.length = 0;
  createdCourseIds.length = 0;
  createdModuleIds.length = 0;
  createdIntakeIds.length = 0;
  createdStudyModeIds.length = 0;
  createdSessionTypeIds.length = 0;
}

// ── Faculty ───────────────────────────────────────────────────────────────

describe("createFaculty", () => {
  afterEach(cleanup);

  it("creates a faculty with ACTIVE status", async () => {
    const faculty = await createFaculty({ name: "Faculty of Computing" });
    createdFacultyIds.push(faculty.id);
    expect(faculty.name).toBe("Faculty of Computing");
    expect(faculty.status).toBe("ACTIVE");
  });
});

describe("editFaculty", () => {
  afterEach(cleanup);

  it("updates the faculty name", async () => {
    const faculty = await createFaculty({ name: "Old Name" });
    createdFacultyIds.push(faculty.id);
    const updated = await editFaculty(faculty.id, { name: "New Name" });
    expect(updated.name).toBe("New Name");
  });
});

describe("markFacultyInactive", () => {
  afterEach(cleanup);

  it("transitions a faculty to INACTIVE", async () => {
    const faculty = await createFaculty({ name: "Faculty of Science" });
    createdFacultyIds.push(faculty.id);
    const updated = await markFacultyInactive(faculty.id);
    expect(updated.status).toBe("INACTIVE");
  });

  it("preserves existing course associations when faculty becomes inactive", async () => {
    const faculty = await createFaculty({ name: "Faculty of Arts" });
    createdFacultyIds.push(faculty.id);
    const course = await createCourse({
      code: "ART001",
      name: "Introduction to Art",
      awardLevel: "DIPLOMA",
      facultyId: faculty.id,
    });
    createdCourseIds.push(course.id);

    await markFacultyInactive(faculty.id);

    const found = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(found.facultyId).toBe(faculty.id);
  });

  it("throws when faculty is already inactive", async () => {
    const faculty = await createFaculty({ name: "Faculty of Law" });
    createdFacultyIds.push(faculty.id);
    await markFacultyInactive(faculty.id);
    await expect(markFacultyInactive(faculty.id)).rejects.toThrow();
  });
});

describe("listFaculties", () => {
  afterEach(cleanup);

  it("excludes inactive faculties by default", async () => {
    const active = await createFaculty({ name: "Active Faculty" });
    const inactive = await createFaculty({ name: "Inactive Faculty" });
    createdFacultyIds.push(active.id, inactive.id);
    await markFacultyInactive(inactive.id);

    const results = await listFaculties();
    const ids = results.map((f) => f.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(inactive.id);
  });

  it("includes inactive faculties when requested", async () => {
    const active = await createFaculty({ name: "Active Faculty 2" });
    const inactive = await createFaculty({ name: "Inactive Faculty 2" });
    createdFacultyIds.push(active.id, inactive.id);
    await markFacultyInactive(inactive.id);

    const results = await listFaculties({ includeInactive: true });
    const ids = results.map((f) => f.id);
    expect(ids).toContain(active.id);
    expect(ids).toContain(inactive.id);
  });
});

// ── Course ────────────────────────────────────────────────────────────────

describe("createCourse", () => {
  afterEach(cleanup);

  it("creates a course with a unique code and ACTIVE status", async () => {
    const faculty = await createFaculty({ name: "Faculty of Engineering" });
    createdFacultyIds.push(faculty.id);
    const course = await createCourse({
      code: "ENG001",
      name: "Software Engineering",
      awardLevel: "DEGREE",
      facultyId: faculty.id,
    });
    createdCourseIds.push(course.id);
    expect(course.code).toBe("ENG001");
    expect(course.status).toBe("ACTIVE");
  });

  it("throws when course code is already in use", async () => {
    const faculty = await createFaculty({ name: "Faculty of Business" });
    createdFacultyIds.push(faculty.id);
    const first = await createCourse({
      code: "BUS001",
      name: "Business Management",
      awardLevel: "DIPLOMA",
      facultyId: faculty.id,
    });
    createdCourseIds.push(first.id);

    await expect(
      createCourse({ code: "BUS001", name: "Business Admin", awardLevel: "DEGREE", facultyId: faculty.id })
    ).rejects.toThrow(/code.*already in use/i);
  });

  it("stores optional awarding body", async () => {
    const faculty = await createFaculty({ name: "Faculty of Health" });
    createdFacultyIds.push(faculty.id);
    const course = await createCourse({
      code: "HLT001",
      name: "Health Sciences",
      awardLevel: "DEGREE",
      facultyId: faculty.id,
      awardingBody: "National Health Academy",
    });
    createdCourseIds.push(course.id);
    expect(course.awardingBody).toBe("National Health Academy");
  });
});

describe("editCourse", () => {
  afterEach(cleanup);

  it("updates the course name", async () => {
    const faculty = await createFaculty({ name: "Faculty of Tech" });
    createdFacultyIds.push(faculty.id);
    const course = await createCourse({ code: "TCH001", name: "Tech Basics", awardLevel: "FOUNDATION", facultyId: faculty.id });
    createdCourseIds.push(course.id);
    const updated = await editCourse(course.id, { name: "Technology Fundamentals" });
    expect(updated.name).toBe("Technology Fundamentals");
  });
});

describe("markCourseInactive", () => {
  afterEach(cleanup);

  it("transitions a course to INACTIVE", async () => {
    const faculty = await createFaculty({ name: "Faculty of Medicine" });
    createdFacultyIds.push(faculty.id);
    const course = await createCourse({ code: "MED001", name: "Medicine", awardLevel: "DEGREE", facultyId: faculty.id });
    createdCourseIds.push(course.id);
    const updated = await markCourseInactive(course.id);
    expect(updated.status).toBe("INACTIVE");
  });

  it("throws when course is already inactive", async () => {
    const faculty = await createFaculty({ name: "Faculty of Education" });
    createdFacultyIds.push(faculty.id);
    const course = await createCourse({ code: "EDU001", name: "Education", awardLevel: "DEGREE", facultyId: faculty.id });
    createdCourseIds.push(course.id);
    await markCourseInactive(course.id);
    await expect(markCourseInactive(course.id)).rejects.toThrow();
  });
});

describe("listCourses", () => {
  afterEach(cleanup);

  it("excludes inactive courses by default", async () => {
    const faculty = await createFaculty({ name: "Faculty of Finance" });
    createdFacultyIds.push(faculty.id);
    const active = await createCourse({ code: "FIN001", name: "Finance", awardLevel: "DEGREE", facultyId: faculty.id });
    const inactive = await createCourse({ code: "FIN002", name: "Accounting", awardLevel: "DIPLOMA", facultyId: faculty.id });
    createdCourseIds.push(active.id, inactive.id);
    await markCourseInactive(inactive.id);

    const results = await listCourses();
    const ids = results.map((c) => c.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(inactive.id);
  });
});

// ── Module ────────────────────────────────────────────────────────────────

describe("createModule", () => {
  afterEach(cleanup);

  it("creates a module with a unique code and ACTIVE status", async () => {
    const mod = await createModule({ code: "CS101", name: "Introduction to Programming" });
    createdModuleIds.push(mod.id);
    expect(mod.code).toBe("CS101");
    expect(mod.status).toBe("ACTIVE");
  });

  it("throws when module code is already in use", async () => {
    const first = await createModule({ code: "CS102", name: "Data Structures" });
    createdModuleIds.push(first.id);
    await expect(
      createModule({ code: "CS102", name: "Algorithms" })
    ).rejects.toThrow(/code.*already in use/i);
  });

  it("stores optional description", async () => {
    const mod = await createModule({ code: "CS103", name: "Databases", description: "Relational database design" });
    createdModuleIds.push(mod.id);
    expect(mod.description).toBe("Relational database design");
  });
});

describe("editModule", () => {
  afterEach(cleanup);

  it("updates the module name and description", async () => {
    const mod = await createModule({ code: "CS104", name: "Networks" });
    createdModuleIds.push(mod.id);
    const updated = await editModule(mod.id, { name: "Computer Networks", description: "LAN and WAN" });
    expect(updated.name).toBe("Computer Networks");
    expect(updated.description).toBe("LAN and WAN");
  });
});

describe("markModuleInactive", () => {
  afterEach(cleanup);

  it("transitions a module to INACTIVE", async () => {
    const mod = await createModule({ code: "CS105", name: "Operating Systems" });
    createdModuleIds.push(mod.id);
    const updated = await markModuleInactive(mod.id);
    expect(updated.status).toBe("INACTIVE");
  });

  it("throws when module is already inactive", async () => {
    const mod = await createModule({ code: "CS106", name: "Compilers" });
    createdModuleIds.push(mod.id);
    await markModuleInactive(mod.id);
    await expect(markModuleInactive(mod.id)).rejects.toThrow();
  });
});

describe("listModules", () => {
  afterEach(cleanup);

  it("excludes inactive modules by default", async () => {
    const active = await createModule({ code: "CS107", name: "AI" });
    const inactive = await createModule({ code: "CS108", name: "ML" });
    createdModuleIds.push(active.id, inactive.id);
    await markModuleInactive(inactive.id);

    const results = await listModules();
    const ids = results.map((m) => m.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(inactive.id);
  });
});

// ── Intake ────────────────────────────────────────────────────────────────

describe("createIntake", () => {
  afterEach(cleanup);

  it("creates an intake with ACTIVE status", async () => {
    const intake = await createIntake({ name: "October" });
    createdIntakeIds.push(intake.id);
    expect(intake.name).toBe("October");
    expect(intake.status).toBe("ACTIVE");
  });
});

describe("editIntake", () => {
  afterEach(cleanup);

  it("updates the intake name", async () => {
    const intake = await createIntake({ name: "March" });
    createdIntakeIds.push(intake.id);
    const updated = await editIntake(intake.id, { name: "April" });
    expect(updated.name).toBe("April");
  });
});

describe("markIntakeInactive", () => {
  afterEach(cleanup);

  it("transitions an intake to INACTIVE", async () => {
    const intake = await createIntake({ name: "December" });
    createdIntakeIds.push(intake.id);
    const updated = await markIntakeInactive(intake.id);
    expect(updated.status).toBe("INACTIVE");
  });

  it("throws when intake is already inactive", async () => {
    const intake = await createIntake({ name: "November" });
    createdIntakeIds.push(intake.id);
    await markIntakeInactive(intake.id);
    await expect(markIntakeInactive(intake.id)).rejects.toThrow();
  });
});

describe("listIntakes", () => {
  afterEach(cleanup);

  it("excludes inactive intakes by default", async () => {
    const active = await createIntake({ name: "August" });
    const inactive = await createIntake({ name: "February" });
    createdIntakeIds.push(active.id, inactive.id);
    await markIntakeInactive(inactive.id);

    const results = await listIntakes();
    const ids = results.map((i) => i.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(inactive.id);
  });
});

// ── StudyMode ─────────────────────────────────────────────────────────────

describe("createStudyMode", () => {
  afterEach(cleanup);

  it("creates a study mode with ACTIVE status", async () => {
    const mode = await createStudyMode({ name: "Distance Learning" });
    createdStudyModeIds.push(mode.id);
    expect(mode.name).toBe("Distance Learning");
    expect(mode.status).toBe("ACTIVE");
  });
});

describe("editStudyMode", () => {
  afterEach(cleanup);

  it("updates the study mode name", async () => {
    const mode = await createStudyMode({ name: "Old Mode" });
    createdStudyModeIds.push(mode.id);
    const updated = await editStudyMode(mode.id, { name: "New Mode" });
    expect(updated.name).toBe("New Mode");
  });
});

describe("markStudyModeInactive", () => {
  afterEach(cleanup);

  it("transitions a study mode to INACTIVE", async () => {
    const mode = await createStudyMode({ name: "Hybrid" });
    createdStudyModeIds.push(mode.id);
    const updated = await markStudyModeInactive(mode.id);
    expect(updated.status).toBe("INACTIVE");
  });

  it("throws when study mode is already inactive", async () => {
    const mode = await createStudyMode({ name: "Async" });
    createdStudyModeIds.push(mode.id);
    await markStudyModeInactive(mode.id);
    await expect(markStudyModeInactive(mode.id)).rejects.toThrow();
  });
});

describe("listStudyModes", () => {
  afterEach(cleanup);

  it("excludes inactive study modes by default", async () => {
    const active = await createStudyMode({ name: "Active Mode" });
    const inactive = await createStudyMode({ name: "Inactive Mode" });
    createdStudyModeIds.push(active.id, inactive.id);
    await markStudyModeInactive(inactive.id);

    const results = await listStudyModes();
    const ids = results.map((m) => m.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(inactive.id);
  });
});

// ── SessionType ───────────────────────────────────────────────────────────

describe("createSessionType", () => {
  afterEach(cleanup);

  it("creates a session type with ACTIVE status", async () => {
    const type = await createSessionType({ name: "Seminar" });
    createdSessionTypeIds.push(type.id);
    expect(type.name).toBe("Seminar");
    expect(type.status).toBe("ACTIVE");
  });
});

describe("editSessionType", () => {
  afterEach(cleanup);

  it("updates the session type name", async () => {
    const type = await createSessionType({ name: "Old Type" });
    createdSessionTypeIds.push(type.id);
    const updated = await editSessionType(type.id, { name: "New Type" });
    expect(updated.name).toBe("New Type");
  });
});

describe("markSessionTypeInactive", () => {
  afterEach(cleanup);

  it("transitions a session type to INACTIVE", async () => {
    const type = await createSessionType({ name: "Field Trip" });
    createdSessionTypeIds.push(type.id);
    const updated = await markSessionTypeInactive(type.id);
    expect(updated.status).toBe("INACTIVE");
  });

  it("throws when session type is already inactive", async () => {
    const type = await createSessionType({ name: "Studio" });
    createdSessionTypeIds.push(type.id);
    await markSessionTypeInactive(type.id);
    await expect(markSessionTypeInactive(type.id)).rejects.toThrow();
  });
});

describe("listSessionTypes", () => {
  afterEach(cleanup);

  it("excludes inactive session types by default", async () => {
    const active = await createSessionType({ name: "Active Type" });
    const inactive = await createSessionType({ name: "Inactive Type" });
    createdSessionTypeIds.push(active.id, inactive.id);
    await markSessionTypeInactive(inactive.id);

    const results = await listSessionTypes();
    const ids = results.map((s) => s.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(inactive.id);
  });
});
