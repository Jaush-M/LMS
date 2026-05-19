"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createInstitutionEvent,
  createCourseOfferingEvent,
  createModuleOfferingEvent,
} from "@/lib/academic-calendar";

export type ActionState = { error?: string } | null;

async function resolveActorId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const account = await prisma.userAccount.findUniqueOrThrow({ where: { userId: session.user.id } });
  return account.id;
}

// ── Institution Events ────────────────────────────────────────────────────────

export async function createInstitutionEventAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const actorId = await resolveActorId();
    const title = (formData.get("title") as string)?.trim();
    const startAt = formData.get("startAt") as string;
    const finishAt = formData.get("finishAt") as string | null;

    if (!title) return { error: "Title is required" };
    if (!startAt) return { error: "Start date is required" };

    await createInstitutionEvent({
      createdById: actorId,
      title,
      startAt: new Date(startAt),
      finishAt: finishAt ? new Date(finishAt) : undefined,
    });

    revalidatePath("/administrator/academic-calendar");
    return null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "An error occurred" };
  }
}

// ── Course Offering Events ────────────────────────────────────────────────────

export async function createCourseOfferingEventAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const actorId = await resolveActorId();
    const title = (formData.get("title") as string)?.trim();
    const startAt = formData.get("startAt") as string;
    const finishAt = formData.get("finishAt") as string | null;
    const courseOfferingId = formData.get("courseOfferingId") as string;

    if (!title) return { error: "Title is required" };
    if (!startAt) return { error: "Start date is required" };
    if (!courseOfferingId) return { error: "Course Offering is required" };

    await createCourseOfferingEvent({
      createdById: actorId,
      courseOfferingId,
      title,
      startAt: new Date(startAt),
      finishAt: finishAt ? new Date(finishAt) : undefined,
    });

    revalidatePath("/administrator/academic-calendar");
    return null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "An error occurred" };
  }
}

// ── Module Offering Events ────────────────────────────────────────────────────

export async function createModuleOfferingEventAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const actorId = await resolveActorId();
    const title = (formData.get("title") as string)?.trim();
    const startAt = formData.get("startAt") as string;
    const finishAt = formData.get("finishAt") as string | null;
    const moduleOfferingId = formData.get("moduleOfferingId") as string;

    if (!title) return { error: "Title is required" };
    if (!startAt) return { error: "Start date is required" };
    if (!moduleOfferingId) return { error: "Module Offering is required" };

    await createModuleOfferingEvent({
      createdById: actorId,
      moduleOfferingId,
      title,
      startAt: new Date(startAt),
      finishAt: finishAt ? new Date(finishAt) : undefined,
    });

    revalidatePath("/educator/academic-calendar");
    return null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "An error occurred" };
  }
}
