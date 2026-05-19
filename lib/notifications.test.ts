import { describe, it, expect, afterEach } from "vitest";
import { listNotifications, markNotificationRead, markAllNotificationsRead, updateStudentReminderPeriod } from "./notifications";
import { sendChatMessage } from "./group-chat";
import { createFaculty, createCourse, createModule, createIntake, createStudyMode } from "./catalogue";
import { createCurriculumTemplate, addAcademicLevel, addTemplateModule } from "./curriculum-template";
import { createCourseOfferingFromTemplate } from "./course-offering";
import { enrollStudent } from "./enrollment";
import { prisma } from "./prisma";
import type { UserRole } from "./generated/prisma/enums";

// ── cleanup tracking ─────────────────────────────────────────────────────────

const createdNotificationIds: string[] = [];
const createdChatMessageIds: string[] = [];
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
  if (createdChatMessageIds.length) {
    await prisma.chatMessage.deleteMany({ where: { id: { in: [...createdChatMessageIds] } } });
    createdChatMessageIds.length = 0;
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
    const uaIds = (
      await prisma.userAccount.findMany({
        where: { userId: { in: [...createdUserIds] } },
        select: { id: true },
      })
    ).map((ua) => ua.id);
    await prisma.notification.deleteMany({ where: { recipientId: { in: uaIds } } });
    await prisma.chatMessage.deleteMany({ where: { senderId: { in: uaIds } } });
    await prisma.auditLogEntry.deleteMany({ where: { actorId: { in: uaIds } } });
    await prisma.userAccount.deleteMany({ where: { userId: { in: [...createdUserIds] } } });
    await prisma.account.deleteMany({ where: { userId: { in: [...createdUserIds] } } });
    await prisma.user.deleteMany({ where: { id: { in: [...createdUserIds] } } });
    createdUserIds.length = 0;
  }
}

afterEach(cleanup);

// ── helpers ───────────────────────────────────────────────────────────────────

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

async function buildOfferingWithChat() {
  const faculty = await createFaculty({ name: `Faculty ${uniqueCode("F")}` });
  createdFacultyIds.push(faculty.id);
  const course = await createCourse({ code: uniqueCode("CRS"), name: "Test Course", awardLevel: "DEGREE", facultyId: faculty.id });
  createdCourseIds.push(course.id);
  const intake = await createIntake({ name: `Intake ${uniqueCode("I")}` });
  createdIntakeIds.push(intake.id);
  const studyMode = await createStudyMode({ name: `Mode ${uniqueCode("SM")}` });
  createdStudyModeIds.push(studyMode.id);
  const template = await createCurriculumTemplate(course.id);
  createdTemplateIds.push(template.id);
  const level = await addAcademicLevel(template.id, { label: "Year 1", sortOrder: 1 });

  const educator = await createTestUserAccount("EDUCATOR");
  const mod = await createModule({ code: uniqueCode("MOD"), name: "Test Module" });
  createdModuleIds.push(mod.id);
  const tm = await addTemplateModule(template.id, { academicLevelId: level.id, moduleId: mod.id, credits: 15, sortOrder: 1 });

  const offering = await createCourseOfferingFromTemplate({
    curriculumTemplateId: template.id,
    intakeId: intake.id,
    studyModeId: studyMode.id,
    name: uniqueCode("Offering"),
    startAt: new Date("2026-01-01"),
    finishAt: new Date("2026-12-31"),
    moduleOfferings: [{ templateModuleId: tm.id, primaryEducatorId: educator.id }],
  });
  createdCourseOfferingIds.push(offering.id);

  const chat = await prisma.moduleGroupChat.findFirstOrThrow({
    where: { moduleOffering: { courseOfferingId: offering.id } },
  });

  return { educator, chat, offering };
}

async function enrollTestStudent(offering: { id: string }, adminId: string) {
  const student = await createTestUserAccount("STUDENT");
  const result = await enrollStudent({ studentId: student.id, courseOfferingId: offering.id, enrolledById: adminId });
  if (result.status !== "enrolled") throw new Error("Enrollment failed in test fixture");
  createdEnrollmentIds.push(result.enrollment.id);
  return student;
}

// ── Mention notifications ─────────────────────────────────────────────────────

describe("chat mention notifications", () => {
  it("creates a CHAT_MENTION notification for a mentioned participant", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { educator, chat, offering } = await buildOfferingWithChat();
    const student = await enrollTestStudent(offering, admin.id);

    const message = await sendChatMessage({
      chatId: chat.id,
      senderId: student.id,
      body: `Hey @${educator.generatedIdentifier} can you help me?`,
    });
    createdChatMessageIds.push(message.id);

    const notifications = await prisma.notification.findMany({
      where: { recipientId: educator.id, sourceType: "CHAT_MENTION" },
    });
    createdNotificationIds.push(...notifications.map((n) => n.id));

    expect(notifications).toHaveLength(1);
    expect(notifications[0].chatMessageId).toBe(message.id);
    expect(notifications[0].title).toContain("Mention");
  });

  it("does not create a notification for a normal chat message without a mention", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { educator, chat, offering } = await buildOfferingWithChat();
    const student = await enrollTestStudent(offering, admin.id);

    const message = await sendChatMessage({
      chatId: chat.id,
      senderId: student.id,
      body: "Just a regular message, no mention here.",
    });
    createdChatMessageIds.push(message.id);

    const notifications = await prisma.notification.findMany({
      where: { recipientId: educator.id, sourceType: "CHAT_MENTION" },
    });

    expect(notifications).toHaveLength(0);
  });

  it("ignores a mention of a non-participant", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const outsider = await createTestUserAccount("EDUCATOR");
    const { educator, chat, offering } = await buildOfferingWithChat();
    const student = await enrollTestStudent(offering, admin.id);

    const message = await sendChatMessage({
      chatId: chat.id,
      senderId: student.id,
      body: `Hello @${outsider.generatedIdentifier}`,
    });
    createdChatMessageIds.push(message.id);

    const notifications = await prisma.notification.findMany({
      where: { recipientId: outsider.id, sourceType: "CHAT_MENTION" },
    });

    expect(notifications).toHaveLength(0);
  });

  it("creates notifications for each distinct mentioned participant", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { educator, chat, offering } = await buildOfferingWithChat();
    const student1 = await enrollTestStudent(offering, admin.id);
    const student2 = await enrollTestStudent(offering, admin.id);

    const message = await sendChatMessage({
      chatId: chat.id,
      senderId: educator.id,
      body: `@${student1.generatedIdentifier} and @${student2.generatedIdentifier} please review.`,
    });
    createdChatMessageIds.push(message.id);

    const [n1, n2] = await Promise.all([
      prisma.notification.findMany({ where: { recipientId: student1.id, sourceType: "CHAT_MENTION" } }),
      prisma.notification.findMany({ where: { recipientId: student2.id, sourceType: "CHAT_MENTION" } }),
    ]);
    createdNotificationIds.push(...n1.map((n) => n.id), ...n2.map((n) => n.id));

    expect(n1).toHaveLength(1);
    expect(n2).toHaveLength(1);
  });
});

// ── Notification Center ───────────────────────────────────────────────────────

describe("listNotifications", () => {
  it("returns all notifications for the recipient, newest first", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { educator, chat, offering } = await buildOfferingWithChat();
    const student = await enrollTestStudent(offering, admin.id);

    const msg1 = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: `@${educator.generatedIdentifier} first` });
    const msg2 = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: `@${educator.generatedIdentifier} second` });
    createdChatMessageIds.push(msg1.id, msg2.id);

    const result = await listNotifications(educator.id);
    const chatMentions = result.filter((n) => n.sourceType === "CHAT_MENTION");
    createdNotificationIds.push(...chatMentions.map((n) => n.id));

    expect(chatMentions.length).toBeGreaterThanOrEqual(2);
    expect(chatMentions[0].createdAt.getTime()).toBeGreaterThanOrEqual(chatMentions[1].createdAt.getTime());
  });
});

describe("markNotificationRead", () => {
  it("sets readAt on the notification", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { educator, chat, offering } = await buildOfferingWithChat();
    const student = await enrollTestStudent(offering, admin.id);

    const msg = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: `@${educator.generatedIdentifier}` });
    createdChatMessageIds.push(msg.id);

    const [notification] = await prisma.notification.findMany({
      where: { recipientId: educator.id, sourceType: "CHAT_MENTION", chatMessageId: msg.id },
    });
    createdNotificationIds.push(notification.id);

    await markNotificationRead(notification.id, educator.id);

    const updated = await prisma.notification.findUniqueOrThrow({ where: { id: notification.id } });
    expect(updated.readAt).not.toBeNull();
  });

  it("throws when a different user tries to mark the notification as read", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { educator, chat, offering } = await buildOfferingWithChat();
    const student = await enrollTestStudent(offering, admin.id);

    const msg = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: `@${educator.generatedIdentifier}` });
    createdChatMessageIds.push(msg.id);

    const [notification] = await prisma.notification.findMany({
      where: { recipientId: educator.id, sourceType: "CHAT_MENTION", chatMessageId: msg.id },
    });
    createdNotificationIds.push(notification.id);

    await expect(markNotificationRead(notification.id, student.id)).rejects.toThrow();
  });
});

describe("markAllNotificationsRead", () => {
  it("marks all unread notifications for the user as read", async () => {
    const admin = await createTestUserAccount("ADMINISTRATOR");
    const { educator, chat, offering } = await buildOfferingWithChat();
    const student = await enrollTestStudent(offering, admin.id);

    const msg1 = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: `@${educator.generatedIdentifier} one` });
    const msg2 = await sendChatMessage({ chatId: chat.id, senderId: student.id, body: `@${educator.generatedIdentifier} two` });
    createdChatMessageIds.push(msg1.id, msg2.id);

    await markAllNotificationsRead(educator.id);

    const unread = await prisma.notification.findMany({
      where: { recipientId: educator.id, readAt: null },
    });
    expect(unread).toHaveLength(0);

    const all = await prisma.notification.findMany({ where: { recipientId: educator.id, sourceType: "CHAT_MENTION" } });
    createdNotificationIds.push(...all.map((n) => n.id));
  });
});

// ── Student Reminder Period ───────────────────────────────────────────────────

describe("updateStudentReminderPeriod", () => {
  it("sets a custom reminder period for a student", async () => {
    const student = await createTestUserAccount("STUDENT");

    await updateStudentReminderPeriod(student.id, 7);

    const updated = await prisma.userAccount.findUniqueOrThrow({ where: { id: student.id } });
    expect(updated.reminderPeriodDays).toBe(7);
  });

  it("throws when a non-student tries to set a reminder period", async () => {
    const educator = await createTestUserAccount("EDUCATOR");

    await expect(updateStudentReminderPeriod(educator.id, 7)).rejects.toThrow();
  });
});
