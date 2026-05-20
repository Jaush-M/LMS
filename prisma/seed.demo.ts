import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "Password@123";

// Anchor date: 2026-05-21
const NOW = new Date("2026-05-21T09:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000);
const from = (days: number) => new Date(NOW.getTime() + days * 86_400_000);
const addHours = (d: Date, h: number) => new Date(d.getTime() + h * 3_600_000);

async function createAuthUser(id: string, name: string, email: string) {
  const hash = await hashPassword(PASSWORD);
  const now = new Date();
  await prisma.user.create({
    data: { id, name, email, emailVerified: false, createdAt: now, updatedAt: now },
  });
  await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: hash,
      createdAt: now,
      updatedAt: now,
    },
  });
}

const ACCOUNTS = [
  { id: "SA000001", name: "Amara Singh",          role: "SUPER_ADMINISTRATOR" as const, status: "ACTIVE" as const, mustChange: false },
  { id: "A000001",  name: "Hassan Ahmed",          role: "ADMINISTRATOR" as const,       status: "ACTIVE" as const, mustChange: false },
  { id: "A000002",  name: "Priya Patel",           role: "ADMINISTRATOR" as const,       status: "ACTIVE" as const, mustChange: false },
  { id: "E000001",  name: "Dr. James Wilson",      role: "EDUCATOR" as const,            status: "ACTIVE" as const, mustChange: false },
  { id: "E000002",  name: "Dr. Sarah Chen",        role: "EDUCATOR" as const,            status: "ACTIVE" as const, mustChange: false },
  { id: "E000003",  name: "Prof. Michael Torres",  role: "EDUCATOR" as const,            status: "ACTIVE" as const, mustChange: false },
  { id: "E000004",  name: "Ms. Fatima Al-Rashid",  role: "EDUCATOR" as const,            status: "ACTIVE" as const, mustChange: false },
  { id: "E000005",  name: "Dr. Riya Sharma",       role: "EDUCATOR" as const,            status: "ACTIVE" as const, mustChange: false },
  // CS students
  { id: "S000001",  name: "Lucas Oliveira",        role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000002",  name: "Mei Lin",               role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000003",  name: "Arjun Nair",            role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000004",  name: "Sofia Martinez",        role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000005",  name: "Ibrahim Khalid",        role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000006",  name: "Yuki Tanaka",           role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000007",  name: "Amelia Brooks",         role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000008",  name: "Omar Hassan",           role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000009",  name: "Isabella Rossi",        role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000010",  name: "Daniel Park",           role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  // IT students
  { id: "S000011",  name: "Aisha Mohammed",        role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000012",  name: "Ryan O'Brien",          role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000013",  name: "Zara Ahmed",            role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000014",  name: "Liam Nguyen",           role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000015",  name: "Chloe Dubois",          role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000016",  name: "Kai Nakamura",          role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000017",  name: "Elena Petrova",         role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  // BA students
  { id: "S000018",  name: "Samuel Okafor",         role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000019",  name: "Valentina Cruz",        role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000020",  name: "Ethan Williams",        role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000021",  name: "Nadia Hussain",         role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
  { id: "S000022",  name: "Marcus Johnson",        role: "STUDENT" as const,             status: "ACTIVE" as const, mustChange: false },
];

async function main() {
  // ── System settings ──────────────────────────────────────────────────────
  await prisma.systemSettings.create({ data: {} });

  // ── Lookup tables ────────────────────────────────────────────────────────
  await prisma.intake.createMany({
    data: ["January", "May", "September"].map((name) => ({ name })),
  });
  await prisma.studyMode.createMany({
    data: ["Face-to-Face", "Blended", "E-Learning"].map((name) => ({ name })),
  });
  await prisma.sessionType.createMany({
    data: ["Lecture", "Practical Workshop", "Tutorial", "Lab", "Exam", "Other"].map((name) => ({ name })),
  });

  // ── User accounts ────────────────────────────────────────────────────────
  const ua: Record<string, string> = {}; // identifier → UserAccount.id
  for (const acc of ACCOUNTS) {
    const authId = crypto.randomUUID();
    const email = `${acc.id.toLowerCase()}@lms.edu.mv`;
    await createAuthUser(authId, acc.name, email);
    const record = await prisma.userAccount.create({
      data: {
        userId: authId,
        role: acc.role,
        generatedIdentifier: acc.id,
        institutionalEmail: `${acc.id}@lms.edu.mv`,
        status: acc.status,
        mustChangePassword: acc.mustChange,
      },
    });
    ua[acc.id] = record.id;
  }

  const admin      = ua["A000001"];
  const e1         = ua["E000001"]; // Dr. James Wilson
  const e2         = ua["E000002"]; // Dr. Sarah Chen
  const e3         = ua["E000003"]; // Prof. Michael Torres
  const e4         = ua["E000004"]; // Ms. Fatima Al-Rashid
  const e5         = ua["E000005"]; // Dr. Riya Sharma
  const csStudents = ["S000001","S000002","S000003","S000004","S000005","S000006","S000007","S000008","S000009","S000010"].map(k => ua[k]);
  const itStudents = ["S000011","S000012","S000013","S000014","S000015","S000016","S000017"].map(k => ua[k]);
  const baStudents = ["S000018","S000019","S000020","S000021","S000022"].map(k => ua[k]);

  // ── Faculties ────────────────────────────────────────────────────────────
  const fTech     = await prisma.faculty.create({ data: { name: "Faculty of Technology" } });
  const fBusiness = await prisma.faculty.create({ data: { name: "Faculty of Business & Management" } });

  // ── Courses ──────────────────────────────────────────────────────────────
  const cCS = await prisma.course.create({ data: { code: "BSC-CS", name: "BSc Computer Science",           awardLevel: "DEGREE",  facultyId: fTech.id } });
  const cIT = await prisma.course.create({ data: { code: "BSC-IT", name: "BSc Information Technology",     awardLevel: "DEGREE",  facultyId: fTech.id } });
  const cBA = await prisma.course.create({ data: { code: "DIP-BA", name: "Diploma in Business Administration", awardLevel: "DIPLOMA", facultyId: fBusiness.id } });

  // ── Modules ──────────────────────────────────────────────────────────────
  const mCS101 = await prisma.module.create({ data: { code: "CS101", name: "Introduction to Programming",  description: "Python programming from first principles." } });
  const mCS102 = await prisma.module.create({ data: { code: "CS102", name: "Web Technologies",             description: "HTML, CSS, and JavaScript for the web." } });
  const mCS103 = await prisma.module.create({ data: { code: "CS103", name: "Database Fundamentals",        description: "Relational databases and SQL." } });
  const mCS104 = await prisma.module.create({ data: { code: "CS104", name: "Computer Networks",            description: "Networking protocols and architecture." } });
  const mCS201 = await prisma.module.create({ data: { code: "CS201", name: "Data Structures & Algorithms", description: "Core algorithms and complexity analysis." } });
  const mCS202 = await prisma.module.create({ data: { code: "CS202", name: "Software Engineering",         description: "SDLC, agile, and project management." } });
  const mIT101 = await prisma.module.create({ data: { code: "IT101", name: "IT Fundamentals",              description: "Overview of information technology." } });
  const mIT102 = await prisma.module.create({ data: { code: "IT102", name: "Networking Essentials",        description: "LAN/WAN design and configuration." } });
  const mIT103 = await prisma.module.create({ data: { code: "IT103", name: "Cybersecurity Basics",         description: "Threat landscape and defensive controls." } });
  const mIT104 = await prisma.module.create({ data: { code: "IT104", name: "Cloud Services",               description: "IaaS, PaaS, and SaaS platforms." } });
  const mBA101 = await prisma.module.create({ data: { code: "BA101", name: "Business Communication",       description: "Professional writing and presentation." } });
  const mBA102 = await prisma.module.create({ data: { code: "BA102", name: "Principles of Accounting",     description: "Financial statements and bookkeeping." } });
  const mBA103 = await prisma.module.create({ data: { code: "BA103", name: "Marketing Essentials",         description: "Marketing mix and consumer behaviour." } });

  // ── Curriculum templates ─────────────────────────────────────────────────
  // BSc CS — Level 4 + Level 5
  const tCS = await prisma.curriculumTemplate.create({ data: { courseId: cCS.id } });
  const csL4 = await prisma.academicLevel.create({ data: { curriculumTemplateId: tCS.id, label: "Level 4", sortOrder: 1, expectedCredits: 120 } });
  const csL5 = await prisma.academicLevel.create({ data: { curriculumTemplateId: tCS.id, label: "Level 5", sortOrder: 2, expectedCredits: 120 } });
  const tmCS101 = await prisma.templateModule.create({ data: { curriculumTemplateId: tCS.id, academicLevelId: csL4.id, moduleId: mCS101.id, credits: 20, sortOrder: 1 } });
  const tmCS102 = await prisma.templateModule.create({ data: { curriculumTemplateId: tCS.id, academicLevelId: csL4.id, moduleId: mCS102.id, credits: 20, sortOrder: 2 } });
  const tmCS103 = await prisma.templateModule.create({ data: { curriculumTemplateId: tCS.id, academicLevelId: csL4.id, moduleId: mCS103.id, credits: 20, sortOrder: 3 } });
  const tmCS104 = await prisma.templateModule.create({ data: { curriculumTemplateId: tCS.id, academicLevelId: csL4.id, moduleId: mCS104.id, credits: 20, sortOrder: 4 } });
  const tmCS201 = await prisma.templateModule.create({ data: { curriculumTemplateId: tCS.id, academicLevelId: csL5.id, moduleId: mCS201.id, credits: 20, sortOrder: 1 } });
  const tmCS202 = await prisma.templateModule.create({ data: { curriculumTemplateId: tCS.id, academicLevelId: csL5.id, moduleId: mCS202.id, credits: 20, sortOrder: 2 } });

  // CS101 default assessment structure
  await prisma.defaultAssessmentComponent.createMany({
    data: [
      { templateModuleId: tmCS101.id, title: "Coursework (Online)",  type: "ONLINE_ASSIGNMENT",  weightPercent: 40, maximumMark: 100 },
      { templateModuleId: tmCS101.id, title: "Final Exam",           type: "OFFLINE_ASSESSMENT", weightPercent: 60, maximumMark: 100 },
    ],
  });

  // BSc IT — Level 4
  const tIT = await prisma.curriculumTemplate.create({ data: { courseId: cIT.id } });
  const itL4 = await prisma.academicLevel.create({ data: { curriculumTemplateId: tIT.id, label: "Level 4", sortOrder: 1, expectedCredits: 120 } });
  const tmIT101 = await prisma.templateModule.create({ data: { curriculumTemplateId: tIT.id, academicLevelId: itL4.id, moduleId: mIT101.id, credits: 20, sortOrder: 1 } });
  const tmIT102 = await prisma.templateModule.create({ data: { curriculumTemplateId: tIT.id, academicLevelId: itL4.id, moduleId: mIT102.id, credits: 20, sortOrder: 2 } });
  const tmIT103 = await prisma.templateModule.create({ data: { curriculumTemplateId: tIT.id, academicLevelId: itL4.id, moduleId: mIT103.id, credits: 20, sortOrder: 3 } });
  const tmIT104 = await prisma.templateModule.create({ data: { curriculumTemplateId: tIT.id, academicLevelId: itL4.id, moduleId: mIT104.id, credits: 20, sortOrder: 4 } });

  // Diploma BA — Level 4
  const tBA = await prisma.curriculumTemplate.create({ data: { courseId: cBA.id } });
  const baL4 = await prisma.academicLevel.create({ data: { curriculumTemplateId: tBA.id, label: "Level 4", sortOrder: 1, expectedCredits: 120 } });
  const tmBA101 = await prisma.templateModule.create({ data: { curriculumTemplateId: tBA.id, academicLevelId: baL4.id, moduleId: mBA101.id, credits: 20, sortOrder: 1 } });
  const tmBA102 = await prisma.templateModule.create({ data: { curriculumTemplateId: tBA.id, academicLevelId: baL4.id, moduleId: mBA102.id, credits: 20, sortOrder: 2 } });
  const tmBA103 = await prisma.templateModule.create({ data: { curriculumTemplateId: tBA.id, academicLevelId: baL4.id, moduleId: mBA103.id, credits: 20, sortOrder: 3 } });

  // ── Lookup helpers ───────────────────────────────────────────────────────
  const intakeJan = await prisma.intake.findFirstOrThrow({ where: { name: "January" } });
  const intakeSep = await prisma.intake.findFirstOrThrow({ where: { name: "September" } });
  const intakeMay = await prisma.intake.findFirstOrThrow({ where: { name: "May" } });
  const modeF2F   = await prisma.studyMode.findFirstOrThrow({ where: { name: "Face-to-Face" } });
  const modeBlend = await prisma.studyMode.findFirstOrThrow({ where: { name: "Blended" } });

  // ── Course offerings ─────────────────────────────────────────────────────
  // BSc CS — January 2026 (ACTIVE, ~4 months in)
  const csStart  = new Date("2026-01-15T00:00:00Z");
  const csFinish = new Date("2026-12-15T00:00:00Z");
  const csOffering = await prisma.courseOffering.create({
    data: { courseId: cCS.id, intakeId: intakeJan.id, studyModeId: modeF2F.id,   name: "BSc Computer Science — January 2026",          startAt: csStart,  finishAt: csFinish, capacity: 30, status: "ACTIVE" },
  });

  // BSc IT — September 2025 (ACTIVE, ~8 months in, near end)
  const itStart  = new Date("2025-09-01T00:00:00Z");
  const itFinish = new Date("2026-06-30T00:00:00Z");
  const itOffering = await prisma.courseOffering.create({
    data: { courseId: cIT.id, intakeId: intakeSep.id, studyModeId: modeBlend.id, name: "BSc Information Technology — September 2025",   startAt: itStart,  finishAt: itFinish, capacity: 25, status: "ACTIVE" },
  });

  // Diploma BA — May 2026 (ACTIVE, just started)
  const baStart  = new Date("2026-05-01T00:00:00Z");
  const baFinish = new Date("2027-01-31T00:00:00Z");
  const baOffering = await prisma.courseOffering.create({
    data: { courseId: cBA.id, intakeId: intakeMay.id, studyModeId: modeF2F.id,   name: "Diploma in Business Administration — May 2026", startAt: baStart,  finishAt: baFinish, capacity: 20, status: "ACTIVE" },
  });

  // ── Module offerings ─────────────────────────────────────────────────────
  const moCS101 = await prisma.moduleOffering.create({ data: { courseOfferingId: csOffering.id, templateModuleId: tmCS101.id, primaryEducatorId: e1, startAt: csStart, finishAt: csFinish, status: "ACTIVE", moduleGroupChat: { create: {} } } });
  const moCS102 = await prisma.moduleOffering.create({ data: { courseOfferingId: csOffering.id, templateModuleId: tmCS102.id, primaryEducatorId: e2, startAt: csStart, finishAt: csFinish, status: "ACTIVE", moduleGroupChat: { create: {} } } });
  const moCS103 = await prisma.moduleOffering.create({ data: { courseOfferingId: csOffering.id, templateModuleId: tmCS103.id, primaryEducatorId: e1, startAt: csStart, finishAt: csFinish, status: "ACTIVE", moduleGroupChat: { create: {} } } });
  await prisma.moduleOffering.create({ data: { courseOfferingId: csOffering.id, templateModuleId: tmCS104.id, primaryEducatorId: e3, startAt: csStart, finishAt: csFinish, status: "ACTIVE", moduleGroupChat: { create: {} } } });
  await prisma.moduleOffering.create({ data: { courseOfferingId: csOffering.id, templateModuleId: tmCS201.id, primaryEducatorId: e2, startAt: csStart, finishAt: csFinish, status: "ACTIVE", moduleGroupChat: { create: {} } } });
  await prisma.moduleOffering.create({ data: { courseOfferingId: csOffering.id, templateModuleId: tmCS202.id, primaryEducatorId: e5, startAt: csStart, finishAt: csFinish, status: "ACTIVE", moduleGroupChat: { create: {} } } });

  const moIT101 = await prisma.moduleOffering.create({ data: { courseOfferingId: itOffering.id, templateModuleId: tmIT101.id, primaryEducatorId: e3, startAt: itStart, finishAt: itFinish, status: "ACTIVE", moduleGroupChat: { create: {} } } });
  await prisma.moduleOffering.create({ data: { courseOfferingId: itOffering.id, templateModuleId: tmIT102.id, primaryEducatorId: e3, startAt: itStart, finishAt: itFinish, status: "ACTIVE", moduleGroupChat: { create: {} } } });
  await prisma.moduleOffering.create({ data: { courseOfferingId: itOffering.id, templateModuleId: tmIT103.id, primaryEducatorId: e1, startAt: itStart, finishAt: itFinish, status: "ACTIVE", moduleGroupChat: { create: {} } } });
  await prisma.moduleOffering.create({ data: { courseOfferingId: itOffering.id, templateModuleId: tmIT104.id, primaryEducatorId: e2, startAt: itStart, finishAt: itFinish, status: "ACTIVE", moduleGroupChat: { create: {} } } });

  const moBA101 = await prisma.moduleOffering.create({ data: { courseOfferingId: baOffering.id, templateModuleId: tmBA101.id, primaryEducatorId: e4, startAt: baStart, finishAt: baFinish, status: "ACTIVE", moduleGroupChat: { create: {} } } });
  await prisma.moduleOffering.create({ data: { courseOfferingId: baOffering.id, templateModuleId: tmBA102.id, primaryEducatorId: e4, startAt: baStart, finishAt: baFinish, status: "ACTIVE", moduleGroupChat: { create: {} } } });
  await prisma.moduleOffering.create({ data: { courseOfferingId: baOffering.id, templateModuleId: tmBA103.id, primaryEducatorId: e5, startAt: baStart, finishAt: baFinish, status: "ACTIVE", moduleGroupChat: { create: {} } } });

  // ── Enrollments ──────────────────────────────────────────────────────────
  for (let i = 0; i < csStudents.length; i++) {
    await prisma.enrollment.create({ data: { studentId: csStudents[i], courseOfferingId: csOffering.id, enrolledById: admin, isMainEnrollment: i === 0 } });
  }
  for (let i = 0; i < itStudents.length; i++) {
    await prisma.enrollment.create({ data: { studentId: itStudents[i], courseOfferingId: itOffering.id, enrolledById: admin, isMainEnrollment: i === 0 } });
  }
  for (let i = 0; i < baStudents.length; i++) {
    await prisma.enrollment.create({ data: { studentId: baStudents[i], courseOfferingId: baOffering.id, enrolledById: admin, isMainEnrollment: i === 0 } });
  }

  // ── Announcements ────────────────────────────────────────────────────────
  await prisma.announcement.create({
    data: { scope: "INSTITUTION", body: "<p>The library will be undergoing maintenance on <strong>28 May 2026</strong>. All online resources remain accessible through the portal throughout this period.</p>", createdById: admin, expiresAt: from(30) },
  });
  await prisma.announcement.create({
    data: { scope: "COURSE_OFFERING", courseOfferingId: csOffering.id, body: "<p>A guest lecture by <strong>Dr. Amir Khan</strong> from TechCorp will be held on <strong>2 June 2026</strong> in Auditorium B. Attendance is strongly encouraged.</p>", createdById: e1 },
  });
  await prisma.announcement.create({
    data: { scope: "MODULE_OFFERING", moduleOfferingId: moCS101.id, body: "<p>Marks for Assignment 1 have been released. Please review your feedback in the Assessment tab. If you have concerns, use the attendance correction window to raise a query.</p>", createdById: e1 },
  });
  await prisma.announcement.create({
    data: { scope: "MODULE_OFFERING", moduleOfferingId: moBA101.id, body: "<p>Welcome to Business Communication! The Week 1 materials are now available. Please complete the pre-reading before our first session on Thursday.</p>", createdById: e4, expiresAt: from(14) },
  });

  // ── Content: CS101 ───────────────────────────────────────────────────────
  const secCS101_1 = await prisma.contentSection.create({ data: { moduleOfferingId: moCS101.id, createdById: e1, title: "Week 1: Getting Started with Python", sortOrder: 1 } });
  await prisma.moduleContent.createMany({
    data: [
      { contentSectionId: secCS101_1.id, createdById: e1, title: "Course Introduction", body: "<p>Welcome to Introduction to Programming. This 12-week module teaches Python from first principles. By the end you will write programs that solve real problems.</p><p><strong>Assessment:</strong> 40% coursework (two assignments), 60% final exam.</p>", status: "PUBLISHED", sortOrder: 1 },
      { contentSectionId: secCS101_1.id, createdById: e1, title: "Setting Up Your Environment", body: "<h2>Install Python 3.12</h2><p>Download from python.org and verify with <code>python --version</code>.</p><h2>VS Code</h2><p>Install the Python extension for syntax highlighting and integrated debugging.</p>", status: "PUBLISHED", sortOrder: 2 },
    ],
  });

  const secCS101_2 = await prisma.contentSection.create({ data: { moduleOfferingId: moCS101.id, createdById: e1, title: "Week 2: Control Flow", sortOrder: 2 } });
  await prisma.moduleContent.createMany({
    data: [
      { contentSectionId: secCS101_2.id, createdById: e1, title: "Conditionals and Loops", body: "<h2>if / elif / else</h2><pre><code>score = 85\nif score >= 90:\n    print('A')\nelif score >= 75:\n    print('B')\nelse:\n    print('C')</code></pre><h2>Loops</h2><p>Use <code>for</code> for a known number of iterations and <code>while</code> for condition-driven repetition.</p>", status: "PUBLISHED", sortOrder: 1 },
      { contentSectionId: secCS101_2.id, createdById: e1, title: "Practice Exercises", body: "<ol><li>Print the Fibonacci sequence up to n=10.</li><li>Determine whether a given number is prime.</li><li>Calculate the factorial of n using a loop.</li></ol>", status: "PUBLISHED", sortOrder: 2 },
    ],
  });

  const secCS101_3 = await prisma.contentSection.create({ data: { moduleOfferingId: moCS101.id, createdById: e1, title: "Week 3: Functions", sortOrder: 3 } });
  await prisma.moduleContent.createMany({
    data: [
      { contentSectionId: secCS101_3.id, createdById: e1, title: "Defining and Calling Functions", body: "<p>Functions promote reuse. Define with <code>def</code>, accept parameters, and return values:</p><pre><code>def greet(name: str) -> str:\n    return f'Hello, {name}!'</code></pre>", status: "PUBLISHED", sortOrder: 1 },
      { contentSectionId: secCS101_3.id, createdById: e1, title: "Scope and Default Arguments (Draft)", body: "<p>Coming soon — local vs global scope, default parameter values, *args and **kwargs.</p>", status: "DRAFT", sortOrder: 2 },
    ],
  });

  // ── Content: CS102 ───────────────────────────────────────────────────────
  const secCS102_1 = await prisma.contentSection.create({ data: { moduleOfferingId: moCS102.id, createdById: e2, title: "Week 1: HTML Foundations", sortOrder: 1 } });
  await prisma.moduleContent.createMany({
    data: [
      { contentSectionId: secCS102_1.id, createdById: e2, title: "HTML Document Structure", body: "<p>Every HTML page follows a standard structure: <code>!DOCTYPE</code>, <code>html</code>, <code>head</code>, and <code>body</code>. Semantic elements like <code>header</code>, <code>main</code>, and <code>footer</code> improve accessibility.</p>", status: "PUBLISHED", sortOrder: 1 },
      { contentSectionId: secCS102_1.id, createdById: e2, title: "Forms and User Input", body: "<p>Forms collect data: <code>&lt;input type=\"text\"&gt;</code>, <code>&lt;select&gt;</code>, <code>&lt;textarea&gt;</code>. Always pair inputs with <code>&lt;label&gt;</code> for accessibility.</p>", status: "PUBLISHED", sortOrder: 2 },
    ],
  });

  // ── Assignments ──────────────────────────────────────────────────────────
  // CS101 A1 — past deadline, marked
  const a1 = await prisma.assignment.create({
    data: { moduleOfferingId: moCS101.id, contentSectionId: secCS101_2.id, createdById: e1, title: "Assignment 1: Python Basics", body: "<h2>Overview</h2><p>Write a Python program that accepts a list of integers and computes the mean, median, and mode, displaying results in a formatted table. Submit a single <code>.py</code> file.</p>", deadline: ago(30), maximumMark: 100, status: "PUBLISHED" },
  });
  // CS101 A2 — upcoming deadline
  const a2 = await prisma.assignment.create({
    data: { moduleOfferingId: moCS101.id, contentSectionId: secCS101_3.id, createdById: e1, title: "Assignment 2: Functions & File I/O", body: "<h2>Task</h2><p>Build a student grade manager that reads from CSV, calculates averages, and writes results sorted by average (descending). Optional: add unit tests for up to 10 bonus marks.</p>", deadline: from(14), maximumMark: 100, status: "PUBLISHED" },
  });
  // CS102 A1 — upcoming
  await prisma.assignment.create({
    data: { moduleOfferingId: moCS102.id, contentSectionId: secCS102_1.id, createdById: e2, title: "Web Portfolio", body: "<p>Build a personal portfolio with a home page, about page, and projects page. Must be responsive. Submit as a .zip containing all files.</p>", deadline: from(21), maximumMark: 100, status: "PUBLISHED" },
  });

  // ── Assessment components ────────────────────────────────────────────────
  const acA1 = await prisma.assessmentComponent.create({ data: { moduleOfferingId: moCS101.id, assignmentId: a1.id, createdById: e1, title: "Assignment 1",  type: "ONLINE_ASSIGNMENT",  weightPercent: 20, maximumMark: 100, sortOrder: 1 } });
  await prisma.assessmentComponent.create({                data: { moduleOfferingId: moCS101.id, assignmentId: a2.id, createdById: e1, title: "Assignment 2",  type: "ONLINE_ASSIGNMENT",  weightPercent: 20, maximumMark: 100, sortOrder: 2 } });
  await prisma.assessmentComponent.create({                data: { moduleOfferingId: moCS101.id,                       createdById: e1, title: "Final Exam",    type: "OFFLINE_ASSESSMENT", weightPercent: 60, maximumMark: 100, sortOrder: 3 } });

  // IT101 assessment components (for final grades)
  const acIT101CW   = await prisma.assessmentComponent.create({ data: { moduleOfferingId: moIT101.id, createdById: e3, title: "Coursework", type: "ONLINE_ASSIGNMENT",  weightPercent: 40, maximumMark: 100, sortOrder: 1 } });
  const acIT101Exam = await prisma.assessmentComponent.create({ data: { moduleOfferingId: moIT101.id, createdById: e3, title: "Final Exam", type: "OFFLINE_ASSESSMENT", weightPercent: 60, maximumMark: 100, sortOrder: 2 } });

  // ── Component marks — CS101 Assignment 1 (released) ─────────────────────
  const a1Scores    = [88, 74, 91, 65, 82, 77, 55, 93, 70, 85];
  const a1Feedbacks = [
    "Excellent solution with clean code and meaningful comments.",
    "Good effort. Minor off-by-one error in the median calculation.",
    "Outstanding work — one of the best submissions in the cohort.",
    "Meets requirements but lacks input validation for edge cases.",
    "Well-structured. The mode calculation was slightly inefficient.",
    "Solid work. Consider list comprehensions for cleaner code.",
    "Incomplete — the mode function was missing from the submission.",
    "Near-perfect. Minor output formatting inconsistencies.",
    "Adequate. Mean was correct; output format needs improvement.",
    "Good overall. Empty-list edge case was not handled.",
  ];
  for (let i = 0; i < csStudents.length; i++) {
    const mark = await prisma.componentMark.create({
      data: { assessmentComponentId: acA1.id, studentId: csStudents[i], score: a1Scores[i], feedback: a1Feedbacks[i], status: "RELEASED", markedById: e1 },
    });
    await prisma.notification.create({
      data: { recipientId: csStudents[i], sourceType: "COMPONENT_MARK", componentMarkId: mark.id, title: "Assignment 1 mark released — Introduction to Programming" },
    });
  }

  // ── Component marks — IT101 (coursework + exam, mix of released/provisional) ─
  const itCWScores   = [72, 85, 61, 90, 54, 78, 83];
  const itExamScores = [80, 84, 63, 92, 56, 69, 91];
  for (let i = 0; i < itStudents.length; i++) {
    await prisma.componentMark.create({ data: { assessmentComponentId: acIT101CW.id,   studentId: itStudents[i], score: itCWScores[i],   status: "RELEASED",  markedById: e3 } });
    await prisma.componentMark.create({ data: { assessmentComponentId: acIT101Exam.id, studentId: itStudents[i], score: itExamScores[i], status: "RELEASED",  markedById: e3 } });
  }

  // ── Final grades — IT101 (provisional → released) ────────────────────────
  for (let i = 0; i < itStudents.length; i++) {
    const pct = itCWScores[i] * 0.4 + itExamScores[i] * 0.6;
    const fg = await prisma.finalGrade.create({
      data: { moduleOfferingId: moIT101.id, studentId: itStudents[i], percentage: Math.round(pct * 10) / 10, isPassing: pct >= 50, status: i < 4 ? "RELEASED" : "PROVISIONAL", releasedById: e3 },
    });
    if (i < 4) {
      await prisma.notification.create({
        data: { recipientId: itStudents[i], sourceType: "FINAL_GRADE", finalGradeId: fg.id, title: "Final grade released — IT Fundamentals" },
      });
    }
  }

  // ── Class sessions — CS101 (9 past, 3 upcoming) ──────────────────────────
  const lecture  = await prisma.sessionType.findFirstOrThrow({ where: { name: "Lecture" } });
  const workshop = await prisma.sessionType.findFirstOrThrow({ where: { name: "Practical Workshop" } });

  const pastSessionDefs = [
    { daysAgo: 60, type: lecture.id,  room: "Room B201" },
    { daysAgo: 53, type: workshop.id, room: "Lab 3" },
    { daysAgo: 46, type: lecture.id,  room: "Room B201" },
    { daysAgo: 39, type: workshop.id, room: "Lab 3" },
    { daysAgo: 32, type: lecture.id,  room: "Room B201" },
    { daysAgo: 25, type: workshop.id, room: "Lab 3" },
    { daysAgo: 18, type: lecture.id,  room: "Room B201" },
    { daysAgo: 11, type: workshop.id, room: "Lab 3" },
    { daysAgo:  4, type: lecture.id,  room: "Room B201" },
  ];

  const pastSessions = [];
  for (const def of pastSessionDefs) {
    const s = await prisma.classSession.create({
      data: { moduleOfferingId: moCS101.id, sessionTypeId: def.type, startAt: ago(def.daysAgo), finishAt: addHours(ago(def.daysAgo), 2), sessionLocation: def.room, attendanceRequired: true, createdById: admin },
    });
    pastSessions.push(s);
  }
  for (const d of [3, 10, 17]) {
    await prisma.classSession.create({
      data: { moduleOfferingId: moCS101.id, sessionTypeId: lecture.id, startAt: from(d), finishAt: addHours(from(d), 2), sessionLocation: "Room B201", attendanceRequired: true, createdById: admin },
    });
  }

  // ── Attendance records ───────────────────────────────────────────────────
  type AttSt = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  const patterns: AttSt[][] = [
    ["PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT"],
    ["PRESENT","PRESENT","PRESENT","ABSENT", "PRESENT","PRESENT","PRESENT","LATE",   "PRESENT"],
    ["PRESENT","LATE",   "PRESENT","PRESENT","PRESENT","PRESENT","ABSENT", "PRESENT","PRESENT"],
    ["ABSENT", "PRESENT","PRESENT","PRESENT","LATE",   "PRESENT","PRESENT","PRESENT","PRESENT"],
    ["PRESENT","PRESENT","ABSENT", "PRESENT","PRESENT","ABSENT", "PRESENT","PRESENT","LATE"  ],
    ["PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT"],
    ["PRESENT","ABSENT", "PRESENT","ABSENT", "PRESENT","PRESENT","ABSENT", "PRESENT","PRESENT"],
    ["LATE",   "PRESENT","PRESENT","PRESENT","PRESENT","LATE",   "PRESENT","PRESENT","PRESENT"],
    ["PRESENT","PRESENT","PRESENT","PRESENT","ABSENT", "PRESENT","PRESENT","PRESENT","ABSENT" ],
    ["PRESENT","PRESENT","LATE",   "PRESENT","PRESENT","PRESENT","PRESENT","ABSENT", "PRESENT"],
  ];

  for (let si = 0; si < csStudents.length; si++) {
    for (let pi = 0; pi < pastSessions.length; pi++) {
      await prisma.attendanceRecord.create({
        data: { classSessionId: pastSessions[pi].id, studentId: csStudents[si], status: patterns[si][pi], submittedById: e1, submittedAt: addHours(pastSessions[pi].startAt, 1) },
      });
    }
  }
  for (const sess of pastSessions) {
    await prisma.educatorAttendanceRecord.create({
      data: { classSessionId: sess.id, educatorId: e1, submittedAttendanceAt: addHours(sess.startAt, 1) },
    });
  }

  // One pending correction request (S000004 was marked ABSENT, claims PRESENT)
  const s4AttRecord = await prisma.attendanceRecord.findFirstOrThrow({
    where: { studentId: csStudents[3], classSessionId: pastSessions[4].id },
  });
  await prisma.attendanceCorrectionRequest.create({
    data: { attendanceRecordId: s4AttRecord.id, requestedById: csStudents[3], requestedStatus: "PRESENT", reason: "I was present — I sat at the back row. The register may have been missed." },
  });

  // ── Chat messages — CS101 ────────────────────────────────────────────────
  const cs101Chat = await prisma.moduleGroupChat.findUniqueOrThrow({ where: { moduleOfferingId: moCS101.id } });
  await prisma.chatMessage.create({ data: { chatId: cs101Chat.id, senderId: e1, body: "Welcome to the CS101 group chat! Use this space to ask questions, share resources, and collaborate. I check this daily." } });
  await prisma.chatMessage.create({ data: { chatId: cs101Chat.id, senderId: csStudents[0], body: "Thanks, Dr. Wilson! Quick question — should we install Python 3.11 or 3.12 for the coursework?" } });
  await prisma.chatMessage.create({ data: { chatId: cs101Chat.id, senderId: e1, body: "Either works, but I recommend 3.12 — it includes performance improvements we will discuss in Week 8." } });
  const mentionMsg = await prisma.chatMessage.create({ data: { chatId: cs101Chat.id, senderId: csStudents[1], body: "@E000001 Can you clarify the submission format for Assignment 2? Should it include unit tests?" } });
  await prisma.chatMessage.create({ data: { chatId: cs101Chat.id, senderId: e1, body: "Unit tests are optional but earn up to 10 bonus marks. Submit as a .zip containing your .py files." } });
  await prisma.chatMessage.create({ data: { chatId: cs101Chat.id, senderId: csStudents[3], body: "Is anyone else finding the recursion section tricky? Happy to set up a study group this week." } });
  await prisma.chatMessage.create({ data: { chatId: cs101Chat.id, senderId: csStudents[5], body: "Great idea! @S000004 Let's meet Thursday after the workshop." } });
  await prisma.notification.create({ data: { recipientId: e1, sourceType: "CHAT_MENTION", chatMessageId: mentionMsg.id, title: "You were mentioned in CS101 group chat" } });

  // Assignment 2 published notifications
  for (const s of csStudents) {
    await prisma.notification.create({ data: { recipientId: s, sourceType: "ASSIGNMENT", assignmentId: a2.id, title: "New assignment published: Assignment 2 — Functions & File I/O" } });
  }

  // ── Feedback periods ─────────────────────────────────────────────────────
  // CS103 — closed (ended 30 days ago)
  await prisma.feedbackPeriod.create({
    data: { moduleOfferingId: moCS103.id, openAt: ago(60), closeAt: ago(30), createdById: admin },
  });
  // IT101 — open now (closes in 3 weeks)
  const itFP = await prisma.feedbackPeriod.create({
    data: { moduleOfferingId: moIT101.id, openAt: ago(7), closeAt: from(21), createdById: admin },
  });
  // BA101 — open now (very fresh)
  await prisma.feedbackPeriod.create({
    data: { moduleOfferingId: moBA101.id, openAt: ago(3), closeAt: from(25), createdById: admin },
  });

  // IT101 feedback responses
  const itRatings  = [5, 4, 4, 5, 3, 4, 5];
  const itComments = [
    "Prof. Torres explains concepts very clearly. The lab sessions are especially helpful.",
    "Good module overall. More worked examples in the notes would help.",
    "Enjoying the course so far. The pace is just right.",
    "Weekly quizzes are a great way to check understanding before lectures.",
    null,
    "Very well organised. Looking forward to the networking labs next month.",
    "Content is relevant and up-to-date with industry practice.",
  ];
  for (let i = 0; i < itStudents.length; i++) {
    await prisma.feedbackResponse.create({
      data: { feedbackPeriodId: itFP.id, studentId: itStudents[i], rating: itRatings[i], comment: itComments[i] },
    });
  }

  // ── Calendar events ──────────────────────────────────────────────────────
  await prisma.institutionEvent.createMany({
    data: [
      { title: "End-of-Semester Examinations", startAt: from(30), finishAt: from(44), createdById: admin },
      { title: "Staff Development Day",         startAt: from(7),  finishAt: from(7),  createdById: admin },
      { title: "Graduation Ceremony 2026",      startAt: from(60), finishAt: from(60), createdById: admin },
    ],
  });
  await prisma.courseOfferingEvent.createMany({
    data: [
      { courseOfferingId: csOffering.id, title: "Mid-Semester Exams",      startAt: from(14), finishAt: from(18), createdById: admin },
      { courseOfferingId: csOffering.id, title: "Assignment 2 Deadline",   startAt: from(14),                    createdById: admin },
      { courseOfferingId: itOffering.id, title: "Final Exam Preparation",  startAt: from(21), finishAt: from(25), createdById: admin },
    ],
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n Demo seed complete\n");
  console.log("Password for all accounts: Password@123\n");
  console.log("Role               Identifier   Email");
  console.log("─────────────────────────────────────────────────────");
  for (const acc of ACCOUNTS.slice(0, 8)) {
    console.log(`${acc.role.padEnd(20)} ${acc.id.padEnd(12)} ${acc.id.toLowerCase()}@lms.edu.mv`);
  }
  console.log("... + 22 students (S000001–S000022@lms.edu.mv)");
  console.log("\nOfferings seeded:");
  console.log("  BSc Computer Science — January 2026   (10 students, 6 modules, ACTIVE)");
  console.log("  BSc Information Technology — Sep 2025 (7 students,  4 modules, ACTIVE, final grades released)");
  console.log("  Diploma Business Admin — May 2026     (5 students,  3 modules, ACTIVE, just started)\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
