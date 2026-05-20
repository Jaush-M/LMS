"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createAssessmentComponent,
  releaseComponentMark,
  upsertComponentMark,
  releaseFinalGrades,
} from "@/lib/assessment";

async function getEducatorAccount() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const account = await prisma.userAccount.findUnique({ where: { userId: session.user.id } });
  if (!account || account.role !== "EDUCATOR") redirect("/dashboard");
  if (account.mustChangePassword) redirect("/change-password");
  return account;
}

export async function createAssessmentComponentAction(_prev: unknown, formData: FormData) {
  const account = await getEducatorAccount();
  const moduleOfferingId = formData.get("moduleOfferingId") as string;
  const title = (formData.get("title") as string)?.trim();
  const type = formData.get("type") as "ONLINE_ASSIGNMENT" | "OFFLINE_ASSESSMENT";
  const weightPercent = parseFloat(formData.get("weightPercent") as string);
  const maximumMark = parseFloat(formData.get("maximumMark") as string);

  if (!title) return { error: "Title is required" };
  if (isNaN(weightPercent)) return { error: "Weight is required" };
  if (isNaN(maximumMark)) return { error: "Maximum mark is required" };

  const existing = await prisma.assessmentComponent.findMany({ where: { moduleOfferingId } });
  const sortOrder = existing.length + 1;

  try {
    await createAssessmentComponent({ moduleOfferingId, createdById: account.id, title, type, weightPercent, maximumMark, sortOrder });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/educator/modules/${moduleOfferingId}/grades`);
}

export async function enterComponentMarkAction(_prev: unknown, formData: FormData) {
  const account = await getEducatorAccount();
  const assessmentComponentId = formData.get("assessmentComponentId") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;
  const studentId = formData.get("studentId") as string;
  const score = parseFloat(formData.get("score") as string);
  const feedback = (formData.get("feedback") as string)?.trim() || undefined;

  if (isNaN(score)) return { error: "Score is required" };

  try {
    await upsertComponentMark({ assessmentComponentId, markedById: account.id, studentId, score, feedback });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/educator/modules/${moduleOfferingId}/grades`);
}

export async function releaseComponentMarkAction(_prev: unknown, formData: FormData) {
  const account = await getEducatorAccount();
  const componentMarkId = formData.get("componentMarkId") as string;
  const moduleOfferingId = formData.get("moduleOfferingId") as string;

  try {
    await releaseComponentMark({ componentMarkId, releasedById: account.id });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/educator/modules/${moduleOfferingId}/grades`);
}

export async function releaseFinalGradesAction(_prev: unknown, formData: FormData) {
  const account = await getEducatorAccount();
  const moduleOfferingId = formData.get("moduleOfferingId") as string;

  try {
    await releaseFinalGrades({ moduleOfferingId, releasedById: account.id });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: (e as Error).message };
  }
  redirect(`/educator/modules/${moduleOfferingId}/grades`);
}
