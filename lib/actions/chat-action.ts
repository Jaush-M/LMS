"use server";

import { redirect } from "next/navigation";
import { requireAuthRedirect } from "@/lib/auth-guard";
import { sendChatMessage, editChatMessage, moderateChatMessage } from "@/lib/group-chat";

export async function sendChatMessageAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect();
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

  redirect(account.role === "EDUCATOR" ? `/educator/modules/${moduleOfferingId}/chat` : `/student/modules/${moduleOfferingId}/chat`);
}

export async function editChatMessageAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect();
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

  redirect(account.role === "EDUCATOR" ? `/educator/modules/${moduleOfferingId}/chat` : `/student/modules/${moduleOfferingId}/chat`);
}

export async function moderateChatMessageAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect();
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

  redirect(account.role === "EDUCATOR" ? `/educator/modules/${moduleOfferingId}/chat` : `/student/modules/${moduleOfferingId}/chat`);
}
