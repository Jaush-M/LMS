"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuthRedirect } from "@/lib/auth-guard";
import {
  createContentSection,
  createModuleContent,
  publishModuleContent,
  unpublishModuleContent,
  deleteModuleContent,
} from "@/lib/module-content";

export async function createContentSectionAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ roles: ["EDUCATOR"] });
  const moduleOfferingId = formData.get("moduleOfferingId") as string;
  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const existing = await prisma.contentSection.findMany({ where: { moduleOfferingId } });
  const sortOrder = existing.length + 1;

  try {
    await createContentSection({ moduleOfferingId, createdById: account.id, title, sortOrder });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/educator/modules/${moduleOfferingId}/content`);
}

export async function createModuleContentAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ roles: ["EDUCATOR"] });
  const contentSectionId = formData.get("contentSectionId") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;
  const title = (formData.get("title") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const existing = await prisma.moduleContent.findMany({ where: { contentSectionId } });
  const sortOrder = existing.length + 1;

  try {
    await createModuleContent({ contentSectionId, createdById: account.id, title, body: body || "", sortOrder });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/educator/modules/${moduleOfferingId}/content`);
}

export async function publishModuleContentAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ roles: ["EDUCATOR"] });
  const id = formData.get("id") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;

  try {
    await publishModuleContent({ id, publishedById: account.id });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/educator/modules/${moduleOfferingId}/content`);
}

export async function unpublishModuleContentAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ roles: ["EDUCATOR"] });
  const id = formData.get("id") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;

  try {
    await unpublishModuleContent({ id, unpublishedById: account.id });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/educator/modules/${moduleOfferingId}/content`);
}

export async function deleteModuleContentAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ roles: ["EDUCATOR"] });
  const id = formData.get("id") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;

  try {
    await deleteModuleContent({ id, deletedById: account.id });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/educator/modules/${moduleOfferingId}/content`);
}
