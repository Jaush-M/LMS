"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendChatMessage, editChatMessage, moderateChatMessage } from "@/lib/group-chat";

async function getAccount() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const account = await prisma.userAccount.findUnique({ where: { userId: session.user.id } });
  if (!account) redirect("/sign-in");
  if (account.mustChangePassword) redirect("/change-password");
  return account;
}

export async function sendChatMessageAction(_prev: unknown, formData: FormData) {
  const account = await getAccount();
  const chatId = formData.get("chatId") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;
  const body = (formData.get("body") as string)?.trim();

  if (!body) return { error: "Message cannot be empty" };

  try {
    await sendChatMessage({ chatId, senderId: account.id, body });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }

  const role = account.role;
  redirect(role === "EDUCATOR" ? `/educator/modules/${moduleOfferingId}/chat` : `/student/modules/${moduleOfferingId}/chat`);
}

export async function editChatMessageAction(_prev: unknown, formData: FormData) {
  const account = await getAccount();
  const messageId = formData.get("messageId") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;
  const body = (formData.get("body") as string)?.trim();

  if (!body) return { error: "Message cannot be empty" };

  try {
    await editChatMessage({ messageId, editorId: account.id, body });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }

  const role = account.role;
  redirect(role === "EDUCATOR" ? `/educator/modules/${moduleOfferingId}/chat` : `/student/modules/${moduleOfferingId}/chat`);
}

export async function moderateChatMessageAction(_prev: unknown, formData: FormData) {
  const account = await getAccount();
  const messageId = formData.get("messageId") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;
  const reason = (formData.get("reason") as string)?.trim();

  if (!reason) return { error: "Moderation reason is required" };

  try {
    await moderateChatMessage({ messageId, moderatorId: account.id, reason });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }

  const role = account.role;
  redirect(role === "EDUCATOR" ? `/educator/modules/${moduleOfferingId}/chat` : `/student/modules/${moduleOfferingId}/chat`);
}
