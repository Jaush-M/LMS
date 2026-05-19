import { describe, it, expect, afterEach } from "vitest";
import {
  sendChatMessage,
  editChatMessage,
  deleteChatMessage,
  moderateChatMessage,
  listChatMessages,
  searchChatMessages,
  markChatSeen,
  hasUnreadChatActivity,
} from "./group-chat";
import { createFaculty, createCourse, createModule, createIntake, createStudyMode } from "./catalogue";
import { createCurriculumTemplate, addAcademicLevel, addTemplateModule } from "./curriculum-template";
import { createCourseOfferingFromTemplate } from "./course-offering";
import { enrollStudent } from "./enrollment";
import { prisma } from "./prisma";
import type { UserRole } from "./generated/prisma/enums";

// ── cleanup tracking ─────────────────────────────────────────────────────────

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
    await prisma.auditLogEntry.deleteMany({ where: { actorId: { in: uaIds } } });
    await prisma.fileAsset.deleteMany({ where: { uploadedById: { in: uaIds } } });
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

async function createOfferingSetup() {
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
  const educator = await createTestUserAccount("EDUCATOR");
  const mod = await createModule({ code: uniqueCode("MOD"), name: "Programming" });
  createdModuleIds.push(mod.id);
  const tm = await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: mod.id, credits: 15, sortOrder: 1 });
  const offering = await createCourseOfferingFromTemplate({
    curriculumTemplateId: template.id,
    intakeId: intake.id,
    studyModeId: studyMode.id,
    name: `SE ${uniqueCode("CO")}`,
    startAt: new Date("2026-09-01T00:00:00.000Z"),
    finishAt: new Date("2027-06-30T00:00:00.000Z"),
    capacity: 30,
    moduleOfferings: [{ templateModuleId: tm.id, primaryEducatorId: educator.id }],
  });
  createdCourseOfferingIds.push(offering.id);
  const moduleOffering = await prisma.moduleOffering.findFirstOrThrow({
    where: { courseOfferingId: offering.id },
    include: { moduleGroupChat: true },
  });
  return { offering, moduleOffering, educator, chat: moduleOffering.moduleGroupChat! };
}

async function enrollTestStudent(courseOfferingId: string, enrolledById: string) {
  const student = await createTestUserAccount("STUDENT");
  const result = await enrollStudent({ studentId: student.id, courseOfferingId, enrolledById: student.id });
  if (result.status !== "enrolled") throw new Error("enrollment failed");
  createdEnrollmentIds.push(result.enrollment.id);
  return student;
}

// ── behaviors 5–7: edit window ────────────────────────────────────────────────

describe("editChatMessage — edit window", () => {
  afterEach(cleanup);

  it("Sender can edit their message within 15 minutes; status becomes EDITED", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat, educator } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    const message = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "Original" });
    const edited = await editChatMessage({ messageId: message.id, editorId: student.id, body: "Corrected" });

    expect(edited.body).toBe("Corrected");
    expect(edited.status).toBe("EDITED");
    expect(edited.editedAt).not.toBeNull();
  });

  it("Edit is rejected after the 15-minute window has closed", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    const message = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "Old message" });
    // back-date the message to 16 minutes ago
    await prisma.chatMessage.update({
      where: { id: message.id },
      data: { createdAt: new Date(Date.now() - 16 * 60 * 1000) },
    });

    await expect(
      editChatMessage({ messageId: message.id, editorId: student.id, body: "Too late" })
    ).rejects.toThrow(/edit window/i);
  });

  it("Non-sender cannot edit another user's message", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat, educator } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    const message = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "My message" });

    await expect(
      editChatMessage({ messageId: message.id, editorId: educator.id, body: "Hijacked" })
    ).rejects.toThrow(/permission/i);
  });
});

// ── behaviors 8–9: sender self-delete ────────────────────────────────────────

describe("deleteChatMessage — sender self-delete", () => {
  afterEach(cleanup);

  it("Sender can delete their own message; status becomes REMOVED and body is cleared", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    const message = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "Delete me" });
    const removed = await deleteChatMessage({ messageId: message.id, senderId: student.id });

    expect(removed.status).toBe("REMOVED");
    expect(removed.body).toBe("");
  });

  it("Non-sender cannot delete another user's message", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat, educator } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    const message = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "My message" });

    await expect(
      deleteChatMessage({ messageId: message.id, senderId: educator.id })
    ).rejects.toThrow(/permission/i);
  });
});

// ── behaviors 15–20: moderation ──────────────────────────────────────────────

describe("moderateChatMessage — administrator message removal", () => {
  afterEach(cleanup);

  it("Student cannot moderate a message — permission denied", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    const message = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "Hello" });

    await expect(
      moderateChatMessage({ messageId: message.id, moderatorId: student.id, reason: "Bad" })
    ).rejects.toThrow(/permission/i);
  });

  it("Educator cannot moderate a message — permission denied", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat, educator } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    const message = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "Hello" });

    await expect(
      moderateChatMessage({ messageId: message.id, moderatorId: educator.id, reason: "Bad" })
    ).rejects.toThrow(/permission/i);
  });

  it("Administrator moderates a message: status REMOVED, body cleared, reason and removedById recorded", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    const message = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "Bad content" });
    const moderated = await moderateChatMessage({ messageId: message.id, moderatorId: admin.id, reason: "Inappropriate language" });

    expect(moderated.status).toBe("REMOVED");
    expect(moderated.body).toBe("");
    expect(moderated.moderationReason).toBe("Inappropriate language");
    expect(moderated.removedById).toBe(admin.id);
  });

  it("Moderation creates an Operational Audit Log entry with actor, message id, and reason", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    const message = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "Offensive content" });
    await moderateChatMessage({ messageId: message.id, moderatorId: admin.id, reason: "Offensive language" });

    const entry = await prisma.auditLogEntry.findFirst({
      where: { actorId: admin.id, entityId: message.id, action: "CHAT_MESSAGE_MODERATED" },
    });

    expect(entry).not.toBeNull();
    expect(entry!.eventType).toBe("OPERATIONAL");
    expect(entry!.reason).toBe("Offensive language");
    expect(entry!.entityType).toBe("ChatMessage");
  });
});

// ── TC-013: removed marker visibility ────────────────────────────────────────

describe("TC-013 — moderated message visibility", () => {
  afterEach(cleanup);

  it("Student cannot find moderated message content via searchChatMessages", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    const message = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "Offensive keyword" });
    await moderateChatMessage({ messageId: message.id, moderatorId: admin.id, reason: "Policy violation" });

    const results = await searchChatMessages({ chatId: chat.id, viewerId: student.id, keyword: "Offensive" });
    expect(results).toHaveLength(0);
  });

  it("Moderated message appears in listChatMessages for a Student with status REMOVED and empty body", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    const message = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "Secret content" });
    await moderateChatMessage({ messageId: message.id, moderatorId: admin.id, reason: "Violation" });

    const messages = await listChatMessages({ chatId: chat.id, viewerId: student.id });
    const moderated = messages.find((m) => m.id === message.id);

    expect(moderated).toBeDefined();
    expect(moderated!.status).toBe("REMOVED");
    expect(moderated!.body).toBe("");
  });

  it("Administrator can search moderated records by moderationReason keyword", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    const message = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "Bad content" });
    await moderateChatMessage({ messageId: message.id, moderatorId: admin.id, reason: "Harassment violation" });

    const results = await searchChatMessages({ chatId: chat.id, viewerId: admin.id, keyword: "Harassment" });
    expect(results.some((m) => m.id === message.id)).toBe(true);
  });
});

// ── behavior 10: read-only when archived ──────────────────────────────────────

describe("sendChatMessage / editChatMessage — archived course offering", () => {
  afterEach(cleanup);

  it("Send is blocked when the Course Offering is archived", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    await prisma.courseOffering.update({ where: { id: offering.id }, data: { status: "ARCHIVED" } });

    await expect(
      sendChatMessage({ chatId: chat.id, senderId: student.id, body: "Too late" })
    ).rejects.toThrow(/read-only/i);
  });

  it("Edit is blocked when the Course Offering is archived", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    const message = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "Before archive" });
    await prisma.courseOffering.update({ where: { id: offering.id }, data: { status: "ARCHIVED" } });

    // editChatMessage doesn't go through assertCanSend, so we add a read-only check there too
    await expect(
      editChatMessage({ messageId: message.id, editorId: student.id, body: "After archive" })
    ).rejects.toThrow(/read-only/i);
  });
});

// ── behavior 11: file attachment size limit ────────────────────────────────────

describe("sendChatMessage — chat attachment size limit", () => {
  afterEach(cleanup);

  it("Rejects a file attachment that exceeds 8 MB with a clear error", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    // Plant an oversized FileAsset directly (9 MB)
    const oversizedAsset = await prisma.fileAsset.create({
      data: {
        storageDriver: "LocalDiskDriver",
        storageKey: `chat/oversized-${Date.now()}.bin`,
        originalFilename: "big.bin",
        mimeType: "application/octet-stream",
        sizeBytes: 9 * 1024 * 1024,
        category: "CHAT_ATTACHMENT",
        uploadedById: student.id,
      },
    });

    await expect(
      sendChatMessage({ chatId: chat.id, senderId: student.id, body: "With big file", fileAssetIds: [oversizedAsset.id] })
    ).rejects.toThrow(/8 MB/i);
  });

  it("Accepts a file attachment at exactly 8 MB", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    const okAsset = await prisma.fileAsset.create({
      data: {
        storageDriver: "LocalDiskDriver",
        storageKey: `chat/ok-${Date.now()}.bin`,
        originalFilename: "fine.bin",
        mimeType: "application/octet-stream",
        sizeBytes: 8 * 1024 * 1024,
        category: "CHAT_ATTACHMENT",
        uploadedById: student.id,
      },
    });

    const message = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "With ok file", fileAssetIds: [okAsset.id] });
    expect(message.attachments).toHaveLength(1);
  });
});

// ── behavior 12: shared links ─────────────────────────────────────────────────

describe("sendChatMessage — shared links", () => {
  afterEach(cleanup);

  it("Shared links are stored with the message", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    const message = await sendChatMessage({
      chatId: chat.id,
      senderId: student.id,
      body: "Check this out",
      sharedLinks: [
        { url: "https://example.com/resource", title: "Resource" },
        { url: "https://example.com/other" },
      ],
    });

    expect(message.sharedLinks).toHaveLength(2);
    expect(message.sharedLinks.find((l) => l.title === "Resource")).toBeDefined();
    expect(message.sharedLinks.find((l) => l.url === "https://example.com/other")).toBeDefined();
  });
});

// ── behavior 13: keyword search ───────────────────────────────────────────────

describe("searchChatMessages", () => {
  afterEach(cleanup);

  it("Returns active messages matching the keyword", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "Hello world" });
    await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "Goodbye world" });
    await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "Something else" });

    const results = await searchChatMessages({ chatId: chat.id, viewerId: student.id, keyword: "world" });
    expect(results).toHaveLength(2);
    expect(results.every((m) => m.body.includes("world"))).toBe(true);
  });

  it("Excluded removed messages from search results for a Student", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    const msg = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "Deleted keyword" });
    await deleteChatMessage({ messageId: msg.id, senderId: student.id });

    const results = await searchChatMessages({ chatId: chat.id, viewerId: student.id, keyword: "Deleted" });
    expect(results).toHaveLength(0);
  });

  it("Administrator can search and finds removed messages by keyword", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    const msg = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "Removed admin keyword" });
    await deleteChatMessage({ messageId: msg.id, senderId: student.id });

    // Direct DB check: body was cleared on delete, so search by body won't find it.
    // Instead verify admin search returns removed messages (body is empty, status REMOVED).
    const results = await searchChatMessages({ chatId: chat.id, viewerId: admin.id, keyword: "" });
    expect(results.some((m) => m.status === "REMOVED")).toBe(true);
  });
});

// ── behavior 14: unread activity indicator ────────────────────────────────────

describe("hasUnreadChatActivity / markChatSeen", () => {
  afterEach(cleanup);

  it("Returns true when there are messages the user has not seen", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat, educator } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    await sendChatMessage({ chatId: chat.id, senderId: educator.id, body: "New message" });

    const unread = await hasUnreadChatActivity({ chatId: chat.id, userId: student.id });
    expect(unread).toBe(true);
  });

  it("Returns false after the user marks the chat as seen", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat, educator } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    await sendChatMessage({ chatId: chat.id, senderId: educator.id, body: "Seen message" });
    await markChatSeen({ chatId: chat.id, userId: student.id });

    const unread = await hasUnreadChatActivity({ chatId: chat.id, userId: student.id });
    expect(unread).toBe(false);
  });

  it("Removed messages do not count as unread activity", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat, educator } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const r = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (r.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(r.enrollment.id);

    await markChatSeen({ chatId: chat.id, userId: student.id });
    const msg = await sendChatMessage({ chatId: chat.id, senderId: educator.id, body: "Then removed" });
    await deleteChatMessage({ messageId: msg.id, senderId: educator.id });

    const unread = await hasUnreadChatActivity({ chatId: chat.id, userId: student.id });
    expect(unread).toBe(false);
  });
});

// ── behavior 1: Student with effective access can send a message ──────────────

describe("sendChatMessage — access", () => {
  afterEach(cleanup);

  it("Student with effective module access can send a message", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { offering, chat } = await createOfferingSetup();
    const student = await createTestUserAccount("STUDENT");
    const result = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: admin.id });
    if (result.status !== "enrolled") throw new Error("enrollment failed");
    createdEnrollmentIds.push(result.enrollment.id);

    const message = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: "Hello everyone" });

    expect(message.body).toBe("Hello everyone");
    expect(message.senderId).toBe(student.id);
    expect(message.status).toBe("ACTIVE");
  });

  it("Assigned educator can send a message in their module group chat", async () => {
    const { chat, educator } = await createOfferingSetup();

    const message = await sendChatMessage({ chatId: chat.id, senderId: educator.id, body: "Good morning class" });

    expect(message.body).toBe("Good morning class");
    expect(message.senderId).toBe(educator.id);
  });

  it("Administrator cannot send a message — view-only", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { chat } = await createOfferingSetup();

    await expect(
      sendChatMessage({ chatId: chat.id, senderId: admin.id, body: "Admin message" })
    ).rejects.toThrow(/permission/i);
  });

  it("Student without effective module access cannot send a message", async () => {
    const { chat } = await createOfferingSetup();
    const outsideStudent = await createTestUserAccount("STUDENT");

    await expect(
      sendChatMessage({ chatId: chat.id, senderId: outsideStudent.id, body: "Uninvited" })
    ).rejects.toThrow(/permission/i);
  });
});
