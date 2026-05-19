import { prisma } from "./prisma";
import { calculateEffectiveModuleAccess } from "./enrollment";
import { validateFileSize } from "./storage/validate-file-size";

// ── helpers ───────────────────────────────────────────────────────────────────

const EDIT_WINDOW_MS = 15 * 60 * 1000;

async function resolveChat(chatId: string) {
  return prisma.moduleGroupChat.findUniqueOrThrow({
    where: { id: chatId },
    include: {
      moduleOffering: {
        include: { courseOffering: true },
      },
    },
  });
}

async function assertCanSend(chatId: string, senderId: string) {
  const chat = await resolveChat(chatId);

  if (chat.isReadOnly || chat.moduleOffering.courseOffering.status === "ARCHIVED") {
    throw new Error("Module Group Chat is read-only");
  }

  const sender = await prisma.userAccount.findUniqueOrThrow({ where: { id: senderId } });

  if (sender.role === "ADMINISTRATOR" || sender.role === "SUPER_ADMINISTRATOR") {
    throw new Error("Permission denied: Administrators may only view Module Group Chats");
  }

  if (sender.role === "EDUCATOR") {
    if (chat.moduleOffering.primaryEducatorId !== sender.id) {
      throw new Error("Permission denied: Educator is not assigned to this Module Offering");
    }
    return chat;
  }

  // Student — verify effective module access
  const courseOfferingId = chat.moduleOffering.courseOfferingId;
  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: sender.id, courseOfferingId, status: "ACTIVE" },
    include: { moduleEnrollmentExceptions: { select: { moduleOfferingId: true, exceptionType: true } } },
  });

  if (!enrollment) {
    throw new Error("Permission denied: Student is not enrolled in this Course Offering");
  }

  const allModuleOfferings = await prisma.moduleOffering.findMany({
    where: { courseOfferingId },
    select: { id: true },
  });

  const effective = calculateEffectiveModuleAccess(allModuleOfferings, enrollment.moduleEnrollmentExceptions);
  if (!effective.some((mo) => mo.id === chat.moduleOfferingId)) {
    throw new Error("Permission denied: Student does not have effective access to this Module Offering");
  }

  return chat;
}

// ── mention parsing and notification dispatch ─────────────────────────────────

function parseMentions(body: string): string[] {
  const matches = [...body.matchAll(/@(\S+)/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

async function getChatParticipantIds(moduleOfferingId: string, primaryEducatorId: string, courseOfferingId: string): Promise<Set<string>> {
  const ids = new Set<string>([primaryEducatorId]);

  const allModuleOfferings = await prisma.moduleOffering.findMany({
    where: { courseOfferingId },
    select: { id: true },
  });

  const enrollments = await prisma.enrollment.findMany({
    where: { courseOfferingId, status: "ACTIVE" },
    include: { moduleEnrollmentExceptions: { select: { moduleOfferingId: true, exceptionType: true } } },
  });

  for (const enrollment of enrollments) {
    const effective = calculateEffectiveModuleAccess(allModuleOfferings, enrollment.moduleEnrollmentExceptions);
    if (effective.some((mo) => mo.id === moduleOfferingId)) {
      ids.add(enrollment.studentId);
    }
  }

  return ids;
}

async function dispatchMentionNotifications(
  messageId: string,
  senderId: string,
  body: string,
  chat: { moduleOfferingId: string; moduleOffering: { primaryEducatorId: string; courseOfferingId: string } }
) {
  const identifiers = parseMentions(body);
  if (!identifiers.length) return;

  const accounts = await prisma.userAccount.findMany({
    where: { generatedIdentifier: { in: identifiers } },
    select: { id: true },
  });
  if (!accounts.length) return;

  const participantIds = await getChatParticipantIds(
    chat.moduleOfferingId,
    chat.moduleOffering.primaryEducatorId,
    chat.moduleOffering.courseOfferingId
  );

  const rows = accounts
    .filter((a) => a.id !== senderId && participantIds.has(a.id))
    .map((a) => ({
      recipientId: a.id,
      sourceType: "CHAT_MENTION" as const,
      chatMessageId: messageId,
      title: "Mention in Module Group Chat",
    }));

  if (rows.length) {
    await prisma.notification.createMany({ data: rows });
  }
}

// ── sendChatMessage ───────────────────────────────────────────────────────────

export type SendChatMessageInput = {
  chatId: string;
  senderId: string;
  body: string;
  sharedLinks?: { url: string; title?: string }[];
  fileAssetIds?: string[];
};

export async function sendChatMessage(input: SendChatMessageInput) {
  const chat = await assertCanSend(input.chatId, input.senderId);

  if (input.fileAssetIds?.length) {
    const assets = await prisma.fileAsset.findMany({
      where: { id: { in: input.fileAssetIds } },
      select: { sizeBytes: true, category: true },
    });
    for (const asset of assets) {
      validateFileSize(asset.category as "CHAT_ATTACHMENT", asset.sizeBytes);
    }
  }

  const message = await prisma.chatMessage.create({
    data: {
      chatId: input.chatId,
      senderId: input.senderId,
      body: input.body,
      sharedLinks: input.sharedLinks
        ? { create: input.sharedLinks.map((l) => ({ url: l.url, title: l.title ?? null })) }
        : undefined,
      attachments: input.fileAssetIds
        ? { create: input.fileAssetIds.map((id) => ({ fileAssetId: id })) }
        : undefined,
    },
    include: { sharedLinks: true, attachments: true },
  });

  await dispatchMentionNotifications(message.id, input.senderId, input.body, chat);

  return message;
}

// ── editChatMessage ───────────────────────────────────────────────────────────

export type EditChatMessageInput = {
  messageId: string;
  editorId: string;
  body: string;
};

export async function editChatMessage(input: EditChatMessageInput) {
  const message = await prisma.chatMessage.findUniqueOrThrow({
    where: { id: input.messageId },
    include: {
      chat: {
        include: { moduleOffering: { include: { courseOffering: true } } },
      },
    },
  });

  if (message.chat.isReadOnly || message.chat.moduleOffering.courseOffering.status === "ARCHIVED") {
    throw new Error("Module Group Chat is read-only");
  }

  if (message.senderId !== input.editorId) {
    throw new Error("Permission denied: only the message sender may edit this message");
  }

  if (message.status === "REMOVED") {
    throw new Error("Cannot edit a removed message");
  }

  const age = Date.now() - message.createdAt.getTime();
  if (age > EDIT_WINDOW_MS) {
    throw new Error("Edit window has closed: messages may only be edited within 15 minutes of sending");
  }

  return prisma.chatMessage.update({
    where: { id: input.messageId },
    data: { body: input.body, status: "EDITED", editedAt: new Date() },
  });
}

// ── deleteChatMessage ─────────────────────────────────────────────────────────

export type DeleteChatMessageInput = {
  messageId: string;
  senderId: string;
};

export async function deleteChatMessage(input: DeleteChatMessageInput) {
  const message = await prisma.chatMessage.findUniqueOrThrow({ where: { id: input.messageId } });

  if (message.senderId !== input.senderId) {
    throw new Error("Permission denied: only the message sender may delete this message");
  }

  return prisma.chatMessage.update({
    where: { id: input.messageId },
    data: { body: "", status: "REMOVED" },
  });
}

// ── moderateChatMessage ───────────────────────────────────────────────────────

export type ModerateChatMessageInput = {
  messageId: string;
  moderatorId: string;
  reason: string;
};

export async function moderateChatMessage(input: ModerateChatMessageInput) {
  const moderator = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.moderatorId } });

  if (moderator.role !== "ADMINISTRATOR" && moderator.role !== "SUPER_ADMINISTRATOR") {
    throw new Error("Permission denied: only Administrators may moderate chat messages");
  }

  const [message] = await prisma.$transaction([
    prisma.chatMessage.update({
      where: { id: input.messageId },
      data: {
        body: "",
        status: "REMOVED",
        moderationReason: input.reason,
        removedById: input.moderatorId,
      },
    }),
    prisma.auditLogEntry.create({
      data: {
        eventType: "OPERATIONAL",
        action: "CHAT_MESSAGE_MODERATED",
        actorId: input.moderatorId,
        entityType: "ChatMessage",
        entityId: input.messageId,
        reason: input.reason,
      },
    }),
  ]);

  return message;
}

// ── listChatMessages ──────────────────────────────────────────────────────────

export type ListChatMessagesInput = {
  chatId: string;
  viewerId: string;
};

export async function listChatMessages(input: ListChatMessagesInput) {
  const viewer = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.viewerId } });
  const isAdmin = viewer.role === "ADMINISTRATOR" || viewer.role === "SUPER_ADMINISTRATOR";

  const messages = await prisma.chatMessage.findMany({
    where: { chatId: input.chatId },
    orderBy: { createdAt: "asc" },
    include: { sharedLinks: true, attachments: true },
  });

  if (isAdmin) return messages;

  return messages.map((m) =>
    m.status === "REMOVED" ? { ...m, body: "", sharedLinks: [], attachments: [] } : m
  );
}

// ── searchChatMessages ────────────────────────────────────────────────────────

export type SearchChatMessagesInput = {
  chatId: string;
  viewerId: string;
  keyword: string;
};

export async function searchChatMessages(input: SearchChatMessagesInput) {
  const viewer = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.viewerId } });
  const isAdmin = viewer.role === "ADMINISTRATOR" || viewer.role === "SUPER_ADMINISTRATOR";

  const where = isAdmin
    ? {
        chatId: input.chatId,
        OR: [
          { body: { contains: input.keyword, mode: "insensitive" as const } },
          { moderationReason: { contains: input.keyword, mode: "insensitive" as const } },
        ],
      }
    : {
        chatId: input.chatId,
        status: { not: "REMOVED" as const },
        body: { contains: input.keyword, mode: "insensitive" as const },
      };

  return prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: { sharedLinks: true, attachments: true },
  });
}

// ── markChatSeen ──────────────────────────────────────────────────────────────

export type MarkChatSeenInput = {
  chatId: string;
  userId: string;
};

export async function markChatSeen(input: MarkChatSeenInput) {
  return prisma.chatParticipantActivity.upsert({
    where: { chatId_userId: { chatId: input.chatId, userId: input.userId } },
    create: { chatId: input.chatId, userId: input.userId, lastSeenAt: new Date() },
    update: { lastSeenAt: new Date() },
  });
}

// ── hasUnreadChatActivity ─────────────────────────────────────────────────────

export type HasUnreadChatActivityInput = {
  chatId: string;
  userId: string;
};

export async function hasUnreadChatActivity(input: HasUnreadChatActivityInput): Promise<boolean> {
  const activity = await prisma.chatParticipantActivity.findUnique({
    where: { chatId_userId: { chatId: input.chatId, userId: input.userId } },
  });

  const since = activity?.lastSeenAt ?? new Date(0);

  const count = await prisma.chatMessage.count({
    where: {
      chatId: input.chatId,
      createdAt: { gt: since },
      status: { not: "REMOVED" },
    },
  });

  return count > 0;
}
