import { describe, it, expect, afterEach } from "vitest";
import {
  createInstitutionEvent,
  createCourseOfferingEvent,
  createModuleOfferingEvent,
  getCalendarFeed,
} from "./academic-calendar";
import { createFaculty, createCourse, createModule, createIntake, createStudyMode } from "./catalogue";
import { createCurriculumTemplate, addAcademicLevel, addTemplateModule } from "./curriculum-template";
import { createCourseOfferingFromTemplate } from "./course-offering";
import { enrollStudent } from "./enrollment";
import { prisma } from "./prisma";
import type { UserRole } from "./generated/prisma/enums";

// ── cleanup tracking ──────────────────────────────────────────────────────────

const createdInstitutionEventIds: string[] = [];
const createdCourseOfferingEventIds: string[] = [];
const createdModuleOfferingEventIds: string[] = [];
const createdCourseOfferingIds: string[] = [];
const createdTemplateIds: string[] = [];
const createdCourseIds: string[] = [];
const createdFacultyIds: string[] = [];
const createdModuleIds: string[] = [];
const createdIntakeIds: string[] = [];
const createdStudyModeIds: string[] = [];
const createdEnrollmentIds: string[] = [];
const createdUserIds: string[] = [];

async function cleanup() {
  if (createdInstitutionEventIds.length) {
    await prisma.institutionEvent.deleteMany({ where: { id: { in: [...createdInstitutionEventIds] } } });
    createdInstitutionEventIds.length = 0;
  }
  if (createdCourseOfferingEventIds.length) {
    await prisma.courseOfferingEvent.deleteMany({ where: { id: { in: [...createdCourseOfferingEventIds] } } });
    createdCourseOfferingEventIds.length = 0;
  }
  if (createdModuleOfferingEventIds.length) {
    await prisma.moduleOfferingEvent.deleteMany({ where: { id: { in: [...createdModuleOfferingEventIds] } } });
    createdModuleOfferingEventIds.length = 0;
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
    await prisma.auditLogEntry.deleteMany({ where: { actorId: { in: [...createdUserIds] } } });
    await prisma.userAccount.deleteMany({ where: { userId: { in: [...createdUserIds] } } });
    await prisma.account.deleteMany({ where: { userId: { in: [...createdUserIds] } } });
    await prisma.user.deleteMany({ where: { id: { in: [...createdUserIds] } } });
    createdUserIds.length = 0;
  }
}

afterEach(cleanup);

// ── helpers ───────────────────────────────────────────────────────────────────

let seq = 0;
function uid(prefix: string) {
  return `${prefix}${Date.now()}${++seq}`;
}

async function createUser(role: UserRole) {
  const userId = uid("u");
  const identifier = uid(`T${role.slice(0, 1)}`);
  const institutionalEmail = `${identifier}@lms.test`;
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

async function buildCourseOffering() {
  const faculty = await createFaculty({ name: uid("fac") });
  createdFacultyIds.push(faculty.id);
  const course = await createCourse({ code: uid("C"), name: uid("course"), awardLevel: "DIPLOMA", facultyId: faculty.id });
  createdCourseIds.push(course.id);
  const module = await createModule({ code: uid("M"), name: uid("mod") });
  createdModuleIds.push(module.id);
  const intake = await createIntake({ name: uid("intake") });
  createdIntakeIds.push(intake.id);
  const studyMode = await createStudyMode({ name: uid("sm") });
  createdStudyModeIds.push(studyMode.id);
  const template = await createCurriculumTemplate(course.id);
  createdTemplateIds.push(template.id);
  const level = await addAcademicLevel(template.id, { label: "L1", sortOrder: 1 });
  const templateModule = await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: module.id, credits: 10, sortOrder: 1 });
  const educator = await createUser("EDUCATOR");
  const offering = await createCourseOfferingFromTemplate({
    curriculumTemplateId: template.id,
    intakeId: intake.id,
    studyModeId: studyMode.id,
    name: uid("CO"),
    startAt: new Date("2026-01-01"),
    finishAt: new Date("2026-12-31"),
    capacity: 30,
    moduleOfferings: [{ templateModuleId: templateModule.id, primaryEducatorId: educator.id }],
  });
  createdCourseOfferingIds.push(offering.id);
  const moduleOffering = await prisma.moduleOffering.findFirstOrThrow({ where: { courseOfferingId: offering.id } });
  return { offering, moduleOffering, educator };
}

// ── Cycle 1: Administrator creates an Institution Event ───────────────────────

describe("createInstitutionEvent", () => {
  it("Administrator can create an Institution Event", async () => {
    const admin = await createUser("ADMINISTRATOR");
    const startAt = new Date("2026-06-01T08:00:00Z");

    const event = await createInstitutionEvent({
      createdById: admin.id,
      title: "Foundation Day",
      startAt,
    });

    createdInstitutionEventIds.push(event.id);
    expect(event.title).toBe("Foundation Day");
    expect(event.startAt).toEqual(startAt);
    expect(event.finishAt).toBeNull();
  });

  it("Administrator can create an Institution Event with a finish time", async () => {
    const admin = await createUser("ADMINISTRATOR");
    const startAt = new Date("2026-06-01T08:00:00Z");
    const finishAt = new Date("2026-06-01T17:00:00Z");

    const event = await createInstitutionEvent({
      createdById: admin.id,
      title: "Orientation Week",
      startAt,
      finishAt,
    });

    createdInstitutionEventIds.push(event.id);
    expect(event.finishAt).toEqual(finishAt);
  });

  it("Student cannot create an Institution Event", async () => {
    const student = await createUser("STUDENT");

    await expect(
      createInstitutionEvent({
        createdById: student.id,
        title: "Unauthorized",
        startAt: new Date("2026-06-01T08:00:00Z"),
      })
    ).rejects.toThrow("Permission denied");
  });

  it("Educator cannot create an Institution Event", async () => {
    const educator = await createUser("EDUCATOR");

    await expect(
      createInstitutionEvent({
        createdById: educator.id,
        title: "Unauthorized",
        startAt: new Date("2026-06-01T08:00:00Z"),
      })
    ).rejects.toThrow("Permission denied");
  });
});

// ── Cycle 2: Administrator creates a Course Offering Event ────────────────────

describe("createCourseOfferingEvent", () => {
  it("Administrator can create a Course Offering Event", async () => {
    const admin = await createUser("ADMINISTRATOR");
    const { offering } = await buildCourseOffering();
    const startAt = new Date("2026-03-15T09:00:00Z");

    const event = await createCourseOfferingEvent({
      createdById: admin.id,
      courseOfferingId: offering.id,
      title: "Mid-term Review",
      startAt,
    });

    createdCourseOfferingEventIds.push(event.id);
    expect(event.title).toBe("Mid-term Review");
    expect(event.courseOfferingId).toBe(offering.id);
  });

  it("Educator cannot create a Course Offering Event", async () => {
    const { offering, educator } = await buildCourseOffering();

    await expect(
      createCourseOfferingEvent({
        createdById: educator.id,
        courseOfferingId: offering.id,
        title: "Unauthorized",
        startAt: new Date("2026-03-15T09:00:00Z"),
      })
    ).rejects.toThrow("Permission denied");
  });

  it("Student cannot create a Course Offering Event", async () => {
    const student = await createUser("STUDENT");
    const { offering } = await buildCourseOffering();

    await expect(
      createCourseOfferingEvent({
        createdById: student.id,
        courseOfferingId: offering.id,
        title: "Unauthorized",
        startAt: new Date("2026-03-15T09:00:00Z"),
      })
    ).rejects.toThrow("Permission denied");
  });
});

// ── Cycle 3: Educator creates a Module Offering Event ────────────────────────

describe("createModuleOfferingEvent", () => {
  it("Educator can create a Module Offering Event for their assigned module offering", async () => {
    const { moduleOffering, educator } = await buildCourseOffering();
    const startAt = new Date("2026-02-10T10:00:00Z");

    const event = await createModuleOfferingEvent({
      createdById: educator.id,
      moduleOfferingId: moduleOffering.id,
      title: "Study Group",
      startAt,
    });

    createdModuleOfferingEventIds.push(event.id);
    expect(event.title).toBe("Study Group");
    expect(event.moduleOfferingId).toBe(moduleOffering.id);
  });

  it("Educator cannot create a Module Offering Event for a module offering they do not own", async () => {
    const { moduleOffering } = await buildCourseOffering();
    const otherEducator = await createUser("EDUCATOR");

    await expect(
      createModuleOfferingEvent({
        createdById: otherEducator.id,
        moduleOfferingId: moduleOffering.id,
        title: "Unauthorized",
        startAt: new Date("2026-02-10T10:00:00Z"),
      })
    ).rejects.toThrow("Permission denied");
  });

  it("Administrator can create a Module Offering Event", async () => {
    const admin = await createUser("ADMINISTRATOR");
    const { moduleOffering } = await buildCourseOffering();

    const event = await createModuleOfferingEvent({
      createdById: admin.id,
      moduleOfferingId: moduleOffering.id,
      title: "Admin-created session",
      startAt: new Date("2026-02-10T10:00:00Z"),
    });

    createdModuleOfferingEventIds.push(event.id);
    expect(event.id).toBeDefined();
  });

  it("Student cannot create a Module Offering Event", async () => {
    const student = await createUser("STUDENT");
    const { moduleOffering } = await buildCourseOffering();

    await expect(
      createModuleOfferingEvent({
        createdById: student.id,
        moduleOfferingId: moduleOffering.id,
        title: "Unauthorized",
        startAt: new Date("2026-02-10T10:00:00Z"),
      })
    ).rejects.toThrow("Permission denied");
  });
});

// ── Cycle 4: getCalendarFeed ──────────────────────────────────────────────────

describe("getCalendarFeed", () => {
  it("Administrator sees Institution Events in their feed", async () => {
    const admin = await createUser("ADMINISTRATOR");
    const startAt = new Date("2026-07-04T08:00:00Z");

    const event = await createInstitutionEvent({
      createdById: admin.id,
      title: "Admin Feed Test Event",
      startAt,
    });
    createdInstitutionEventIds.push(event.id);

    const feed = await getCalendarFeed(admin.id);
    const found = feed.find((item) => item.id === event.id);
    expect(found).toBeDefined();
    expect(found?.kind).toBe("INSTITUTION_EVENT");
    expect(found?.title).toBe("Admin Feed Test Event");
  });

  it("Administrator sees all Course Offering Events in their feed", async () => {
    const admin = await createUser("ADMINISTRATOR");
    const { offering } = await buildCourseOffering();

    const event = await createCourseOfferingEvent({
      createdById: admin.id,
      courseOfferingId: offering.id,
      title: "CO Feed Test Event",
      startAt: new Date("2026-04-01T09:00:00Z"),
    });
    createdCourseOfferingEventIds.push(event.id);

    const feed = await getCalendarFeed(admin.id);
    const found = feed.find((item) => item.id === event.id);
    expect(found).toBeDefined();
    expect(found?.kind).toBe("COURSE_OFFERING_EVENT");
  });

  it("Student sees Institution Events in their feed", async () => {
    const admin = await createUser("ADMINISTRATOR");
    const student = await createUser("STUDENT");

    const event = await createInstitutionEvent({
      createdById: admin.id,
      title: "Student Feed Institution Event",
      startAt: new Date("2026-08-01T08:00:00Z"),
    });
    createdInstitutionEventIds.push(event.id);

    const feed = await getCalendarFeed(student.id);
    const found = feed.find((item) => item.id === event.id);
    expect(found).toBeDefined();
    expect(found?.kind).toBe("INSTITUTION_EVENT");
  });

  it("Student sees Course Offering Events only for their enrolled course offerings", async () => {
    const admin = await createUser("ADMINISTRATOR");
    const student = await createUser("STUDENT");
    const { offering, moduleOffering } = await buildCourseOffering();

    const enrollResult = await enrollStudent({
      studentId: student.id,
      courseOfferingId: offering.id,
      enrolledById: admin.id,
    });
    if (enrollResult.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(enrollResult.enrollment.id);

    const { offering: otherOffering } = await buildCourseOffering();

    const myEvent = await createCourseOfferingEvent({
      createdById: admin.id,
      courseOfferingId: offering.id,
      title: "My CO Event",
      startAt: new Date("2026-04-10T09:00:00Z"),
    });
    createdCourseOfferingEventIds.push(myEvent.id);

    const otherEvent = await createCourseOfferingEvent({
      createdById: admin.id,
      courseOfferingId: otherOffering.id,
      title: "Other CO Event",
      startAt: new Date("2026-04-10T09:00:00Z"),
    });
    createdCourseOfferingEventIds.push(otherEvent.id);

    const feed = await getCalendarFeed(student.id);
    const ids = feed.map((i) => i.id);
    expect(ids).toContain(myEvent.id);
    expect(ids).not.toContain(otherEvent.id);
  });

  it("Student sees Module Offering Events for their Effective Module Access", async () => {
    const admin = await createUser("ADMINISTRATOR");
    const student = await createUser("STUDENT");
    const { offering, moduleOffering, educator } = await buildCourseOffering();

    const enrollResult3 = await enrollStudent({
      studentId: student.id,
      courseOfferingId: offering.id,
      enrolledById: admin.id,
    });
    if (enrollResult3.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(enrollResult3.enrollment.id);

    const { moduleOffering: otherModuleOffering } = await buildCourseOffering();

    const myEvent = await createModuleOfferingEvent({
      createdById: educator.id,
      moduleOfferingId: moduleOffering.id,
      title: "My MO Event",
      startAt: new Date("2026-04-15T10:00:00Z"),
    });
    createdModuleOfferingEventIds.push(myEvent.id);

    const otherEvent = await createModuleOfferingEvent({
      createdById: admin.id,
      moduleOfferingId: otherModuleOffering.id,
      title: "Other MO Event",
      startAt: new Date("2026-04-15T10:00:00Z"),
    });
    createdModuleOfferingEventIds.push(otherEvent.id);

    const feed = await getCalendarFeed(student.id);
    const ids = feed.map((i) => i.id);
    expect(ids).toContain(myEvent.id);
    expect(ids).not.toContain(otherEvent.id);
  });

  it("Educator sees Module Offering Events for their assigned module offerings", async () => {
    const admin = await createUser("ADMINISTRATOR");
    const { moduleOffering, educator } = await buildCourseOffering();
    const { moduleOffering: otherMO } = await buildCourseOffering();

    const myEvent = await createModuleOfferingEvent({
      createdById: educator.id,
      moduleOfferingId: moduleOffering.id,
      title: "Educator MO Event",
      startAt: new Date("2026-05-01T10:00:00Z"),
    });
    createdModuleOfferingEventIds.push(myEvent.id);

    const otherEvent = await createModuleOfferingEvent({
      createdById: admin.id,
      moduleOfferingId: otherMO.id,
      title: "Other Educator MO Event",
      startAt: new Date("2026-05-01T10:00:00Z"),
    });
    createdModuleOfferingEventIds.push(otherEvent.id);

    const feed = await getCalendarFeed(educator.id);
    const ids = feed.map((i) => i.id);
    expect(ids).toContain(myEvent.id);
    expect(ids).not.toContain(otherEvent.id);
  });

  it("feed items are sorted by startAt ascending", async () => {
    const admin = await createUser("ADMINISTRATOR");

    const later = await createInstitutionEvent({
      createdById: admin.id,
      title: "Later Event",
      startAt: new Date("2026-09-01T08:00:00Z"),
    });
    createdInstitutionEventIds.push(later.id);

    const earlier = await createInstitutionEvent({
      createdById: admin.id,
      title: "Earlier Event",
      startAt: new Date("2026-08-01T08:00:00Z"),
    });
    createdInstitutionEventIds.push(earlier.id);

    const feed = await getCalendarFeed(admin.id);
    const eventItems = feed.filter((i) => i.id === earlier.id || i.id === later.id);
    expect(eventItems[0].id).toBe(earlier.id);
    expect(eventItems[1].id).toBe(later.id);
  });
});
