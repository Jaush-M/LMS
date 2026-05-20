import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const TEMP_PASSWORD = "TempPass123!";

async function createAuthUser(params: {
  id: string;
  name: string;
  authEmail: string;
  password: string;
}) {
  const hash = await hashPassword(params.password);
  const now = new Date();

  await prisma.user.create({
    data: {
      id: params.id,
      name: params.name,
      email: params.authEmail,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: params.id,
      providerId: "credential",
      userId: params.id,
      password: hash,
      createdAt: now,
      updatedAt: now,
    },
  });
}

const accounts = [
  {
    name: "Super Administrator",
    role: "SUPER_ADMINISTRATOR" as const,
    generatedIdentifier: "SA000001",
    institutionalEmail: "SA000001@lms.edu.mv",
    status: "ACTIVE" as const,
    mustChangePassword: false,
  },
  {
    name: "Administrator",
    role: "ADMINISTRATOR" as const,
    generatedIdentifier: "A000001",
    institutionalEmail: "A000001@lms.edu.mv",
    status: "ACTIVE" as const,
    mustChangePassword: false,
  },
  {
    name: "Educator",
    role: "EDUCATOR" as const,
    generatedIdentifier: "E000001",
    institutionalEmail: "E000001@lms.edu.mv",
    status: "ACTIVE" as const,
    mustChangePassword: false,
  },
  {
    name: "Student",
    role: "STUDENT" as const,
    generatedIdentifier: "S000001",
    institutionalEmail: "S000001@lms.edu.mv",
    status: "ACTIVE" as const,
    mustChangePassword: false,
  },
  {
    name: "Inactive Student",
    role: "STUDENT" as const,
    generatedIdentifier: "S000002",
    institutionalEmail: "S000002@lms.edu.mv",
    status: "INACTIVE" as const,
    mustChangePassword: true,
  },
  {
    name: "Disabled Student",
    role: "STUDENT" as const,
    generatedIdentifier: "S000003",
    institutionalEmail: "S000003@lms.edu.mv",
    status: "DISABLED" as const,
    mustChangePassword: false,
  },
  {
    name: "Force Change Student",
    role: "STUDENT" as const,
    generatedIdentifier: "S000004",
    institutionalEmail: "S000004@lms.edu.mv",
    status: "ACTIVE" as const,
    mustChangePassword: true,
  },
  {
    name: "Inactive Management Student",
    role: "STUDENT" as const,
    generatedIdentifier: "S000005",
    institutionalEmail: "S000005@lms.edu.mv",
    status: "INACTIVE" as const,
    mustChangePassword: true,
  },
  {
    name: "Active Management Student",
    role: "STUDENT" as const,
    generatedIdentifier: "S000006",
    institutionalEmail: "S000006@lms.edu.mv",
    status: "ACTIVE" as const,
    mustChangePassword: false,
  },
  // TC-004: third student to attempt over-capacity enrollment
  {
    name: "Enrollment Test Student",
    role: "STUDENT" as const,
    generatedIdentifier: "S000007",
    institutionalEmail: "S000007@lms.edu.mv",
    status: "ACTIVE" as const,
    mustChangePassword: false,
  },
];

const defaultIntakes = ["January", "May", "September"];
const defaultStudyModes = ["Face-to-Face", "Blended", "E-Learning"];
const defaultSessionTypes = ["Lecture", "Practical Workshop", "Tutorial", "Lab", "Exam", "Other"];

async function main() {
  await prisma.intake.createMany({
    data: defaultIntakes.map((name) => ({ name })),
  });
  await prisma.studyMode.createMany({
    data: defaultStudyModes.map((name) => ({ name })),
  });
  await prisma.sessionType.createMany({
    data: defaultSessionTypes.map((name) => ({ name })),
  });

  // ── user accounts ────────────────────────────────────────────────────────

  const userIds: Record<string, string> = {};
  for (const account of accounts) {
    const id = crypto.randomUUID();
    userIds[account.generatedIdentifier] = id;
    await createAuthUser({
      id,
      name: account.name,
      authEmail: account.institutionalEmail.toLowerCase(),
      password: TEMP_PASSWORD,
    });
    await prisma.userAccount.create({
      data: {
        userId: id,
        role: account.role,
        generatedIdentifier: account.generatedIdentifier,
        institutionalEmail: account.institutionalEmail,
        status: account.status,
        mustChangePassword: account.mustChangePassword,
      },
    });
  }

  // ── academic catalogue ───────────────────────────────────────────────────

  const faculty = await prisma.faculty.create({
    data: { name: "Faculty of Technology" },
  });

  const course = await prisma.course.create({
    data: {
      code: "BSC-CS",
      name: "BSc Computer Science",
      awardLevel: "DEGREE",
      facultyId: faculty.id,
    },
  });

  const mod1 = await prisma.module.create({
    data: { code: "SEED-CS101", name: "Programming Fundamentals" },
  });
  const mod2 = await prisma.module.create({
    data: { code: "SEED-CS102", name: "Data Structures" },
  });

  // ── curriculum template ──────────────────────────────────────────────────

  const template = await prisma.curriculumTemplate.create({
    data: { courseId: course.id },
  });

  const level = await prisma.academicLevel.create({
    data: {
      curriculumTemplateId: template.id,
      label: "Level 4",
      sortOrder: 1,
      expectedCredits: 120,
    },
  });

  const tm1 = await prisma.templateModule.create({
    data: {
      curriculumTemplateId: template.id,
      academicLevelId: level.id,
      moduleId: mod1.id,
      credits: 20,
      sortOrder: 1,
    },
  });
  const tm2 = await prisma.templateModule.create({
    data: {
      curriculumTemplateId: template.id,
      academicLevelId: level.id,
      moduleId: mod2.id,
      credits: 20,
      sortOrder: 2,
    },
  });

  // ── course offering for TC-004 (capacity filled) ────────────────────────

  const intake = await prisma.intake.findFirstOrThrow({ where: { name: "January" } });
  const studyMode = await prisma.studyMode.findFirstOrThrow({ where: { name: "Face-to-Face" } });
  const educatorAccount = await prisma.userAccount.findUniqueOrThrow({
    where: { generatedIdentifier: "E000001" },
  });
  const student1 = await prisma.userAccount.findUniqueOrThrow({
    where: { generatedIdentifier: "S000001" },
  });
  const student6 = await prisma.userAccount.findUniqueOrThrow({
    where: { generatedIdentifier: "S000006" },
  });
  const administrator = await prisma.userAccount.findUniqueOrThrow({
    where: { generatedIdentifier: "A000001" },
  });

  const offeringStart = new Date("2025-01-15T00:00:00Z");
  const offeringFinish = new Date("2025-12-15T00:00:00Z");

  const fullOffering = await prisma.courseOffering.create({
    data: {
      courseId: course.id,
      intakeId: intake.id,
      studyModeId: studyMode.id,
      name: "BSc CS — January 2025",
      startAt: offeringStart,
      finishAt: offeringFinish,
      capacity: 2,
      moduleOfferings: {
        create: [
          {
            templateModuleId: tm1.id,
            primaryEducatorId: educatorAccount.id,
            startAt: offeringStart,
            finishAt: offeringFinish,
            moduleGroupChat: { create: {} },
          },
          {
            templateModuleId: tm2.id,
            primaryEducatorId: educatorAccount.id,
            startAt: offeringStart,
            finishAt: offeringFinish,
            moduleGroupChat: { create: {} },
          },
        ],
      },
    },
  });

  // enroll two students to fill capacity
  await prisma.enrollment.create({
    data: {
      studentId: student1.id,
      courseOfferingId: fullOffering.id,
      enrolledById: administrator.id,
      isMainEnrollment: true,
    },
  });
  await prisma.enrollment.create({
    data: {
      studentId: student6.id,
      courseOfferingId: fullOffering.id,
      enrolledById: administrator.id,
      isMainEnrollment: false,
    },
  });

  // ── course offering for TC-005 CSV import ───────────────────────────────

  const mayIntake = await prisma.intake.findFirstOrThrow({ where: { name: "May" } });

  const csvOffering = await prisma.courseOffering.create({
    data: {
      courseId: course.id,
      intakeId: mayIntake.id,
      studyModeId: studyMode.id,
      name: "BSc CS — May 2025",
      startAt: new Date("2025-05-15T00:00:00Z"),
      finishAt: new Date("2025-12-15T00:00:00Z"),
      capacity: 24,
      moduleOfferings: {
        create: [
          {
            templateModuleId: tm1.id,
            primaryEducatorId: educatorAccount.id,
            startAt: new Date("2025-05-15T00:00:00Z"),
            finishAt: new Date("2025-12-15T00:00:00Z"),
            moduleGroupChat: { create: {} },
          },
          {
            templateModuleId: tm2.id,
            primaryEducatorId: educatorAccount.id,
            startAt: new Date("2025-05-15T00:00:00Z"),
            finishAt: new Date("2025-12-15T00:00:00Z"),
            moduleGroupChat: { create: {} },
          },
        ],
      },
    },
  });
  void csvOffering;

  console.log("Seed complete");
  console.log(`Super Administrator: SA000001@lms.edu.mv / ${TEMP_PASSWORD}`);
  console.log(`Administrator:       A000001@lms.edu.mv / ${TEMP_PASSWORD}`);
  console.log(`Educator:            E000001@lms.edu.mv / ${TEMP_PASSWORD}`);
  console.log(`Student:             S000001@lms.edu.mv / ${TEMP_PASSWORD}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
