"use server";

import { revalidatePath } from "next/cache";
import { requireAuthAction } from "@/lib/auth-guard";
import {
  createInstitutionEvent,
  createCourseOfferingEvent,
  createModuleOfferingEvent,
} from "@/lib/academic-calendar";

export type ActionState = { error?: string } | null;

// ── Institution Events ────────────────────────────────────────────────────────

export async function createInstitutionEventAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { account } = await requireAuthAction({ minRole: "ADMINISTRATOR" });
  try {
    const title = (formData.get("title") as string)?.trim();
    const startAt = formData.get("startAt") as string;
    const finishAt = formData.get("finishAt") as string | null;

    if (!title) return { error: "Title is required" };
    if (!startAt) return { error: "Start date is required" };

    await createInstitutionEvent({
      createdById: account.id,
      title,
      startAt: new Date(startAt),
      finishAt: finishAt ? new Date(finishAt) : undefined,
    });

    revalidatePath("/admin/academic-calendar");
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
  const { account } = await requireAuthAction({ minRole: "ADMINISTRATOR" });
  try {
    const title = (formData.get("title") as string)?.trim();
    const startAt = formData.get("startAt") as string;
    const finishAt = formData.get("finishAt") as string | null;
    const courseOfferingId = formData.get("courseOfferingId") as string;

    if (!title) return { error: "Title is required" };
    if (!startAt) return { error: "Start date is required" };
    if (!courseOfferingId) return { error: "Course Offering is required" };

    await createCourseOfferingEvent({
      createdById: account.id,
      courseOfferingId,
      title,
      startAt: new Date(startAt),
      finishAt: finishAt ? new Date(finishAt) : undefined,
    });

    revalidatePath("/admin/academic-calendar");
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
  const { account } = await requireAuthAction({ roles: ["EDUCATOR"] });
  try {
    const title = (formData.get("title") as string)?.trim();
    const startAt = formData.get("startAt") as string;
    const finishAt = formData.get("finishAt") as string | null;
    const moduleOfferingId = formData.get("moduleOfferingId") as string;

    if (!title) return { error: "Title is required" };
    if (!startAt) return { error: "Start date is required" };
    if (!moduleOfferingId) return { error: "Module Offering is required" };

    await createModuleOfferingEvent({
      createdById: account.id,
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
