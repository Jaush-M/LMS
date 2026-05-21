"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuthRedirect } from "@/lib/auth-guard";
import {
  createContentSection,
  deleteContentSection,
  createModuleContent,
  publishModuleContent,
  unpublishModuleContent,
  deleteModuleContent,
  addContentAttachment,
  deleteContentAttachment,
} from "@/lib/module-content";
import { uploadFile } from "@/lib/storage/upload-file";
import { LocalDiskDriver } from "@/lib/storage/local-driver";
import { env } from "@/lib/env";

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

export async function deleteContentSectionAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ roles: ["EDUCATOR"] });
  const id = formData.get("id") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;

  try {
    await deleteContentSection({ id, deletedById: account.id });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/educator/modules/${moduleOfferingId}/content`);
}

export async function addContentAttachmentAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ roles: ["EDUCATOR"] });
  const contentItemId = formData.get("contentItemId") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) return { error: "Please select a file" };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `content/${contentItemId}/${Date.now()}_${safeName}`;
    const driver = new LocalDiskDriver(env.LOCAL_STORAGE_PATH, env.BETTER_AUTH_URL);
    const asset = await uploadFile(
      { buffer, key, originalFilename: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, category: "CONTENT_ATTACHMENT", uploadedById: account.id },
      driver,
      prisma
    );
    await addContentAttachment({ contentItemId, addedById: account.id, fileAssetId: asset.id });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/educator/modules/${moduleOfferingId}/content`);
}

export async function deleteContentAttachmentAction(_prev: unknown, formData: FormData) {
  const { account } = await requireAuthRedirect({ roles: ["EDUCATOR"] });
  const attachmentId = formData.get("attachmentId") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;

  try {
    await deleteContentAttachment({ attachmentId, deletedById: account.id });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/educator/modules/${moduleOfferingId}/content`);
}
