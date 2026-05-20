"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createFaculty,
  editFaculty,
  markFacultyInactive,
  createCourse,
  editCourse,
  markCourseInactive,
  createModule,
  editModule,
  markModuleInactive,
  createIntake,
  editIntake,
  markIntakeInactive,
  createStudyMode,
  editStudyMode,
  markStudyModeInactive,
  createSessionType,
  editSessionType,
  markSessionTypeInactive,
} from "@/lib/catalogue";
import type { AwardLevel } from "@/lib/generated/prisma/enums";

async function requireAdministrator() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const actor = await prisma.userAccount.findUniqueOrThrow({
    where: { userId: session.user.id },
    select: { role: true },
  });
  if (actor.role !== "ADMINISTRATOR" && actor.role !== "SUPER_ADMINISTRATOR") {
    throw new Error("Unauthorized");
  }
}

export type ActionState = { error?: string } | null;

// ── Faculty ───────────────────────────────────────────────────────────────

export async function createFacultyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdministrator();
    const name = (formData.get("name") as string)?.trim();
    if (!name) return { error: "Name is required" };
    await createFaculty({ name });
    revalidatePath("/admin/catalogue/faculties");
    return null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "An error occurred" };
  }
}

export async function editFacultyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdministrator();
    const id = formData.get("id") as string;
    const name = (formData.get("name") as string)?.trim();
    if (!name) return { error: "Name is required" };
    await editFaculty(id, { name });
    revalidatePath("/admin/catalogue/faculties");
    return null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "An error occurred" };
  }
}

export async function markFacultyInactiveAction(id: string): Promise<void> {
  await requireAdministrator();
  await markFacultyInactive(id);
  revalidatePath("/admin/catalogue/faculties");
}

// ── Course ────────────────────────────────────────────────────────────────

const VALID_AWARD_LEVELS: AwardLevel[] = ["FOUNDATION", "DIPLOMA", "DEGREE", "MASTERS", "PHD"];

export async function createCourseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdministrator();
    const code = (formData.get("code") as string)?.trim().toUpperCase();
    const name = (formData.get("name") as string)?.trim();
    const awardLevel = formData.get("awardLevel") as AwardLevel;
    const facultyId = formData.get("facultyId") as string;
    const awardingBody = (formData.get("awardingBody") as string)?.trim() || undefined;

    if (!code) return { error: "Course code is required" };
    if (!name) return { error: "Name is required" };
    if (!VALID_AWARD_LEVELS.includes(awardLevel)) return { error: "Invalid award level" };
    if (!facultyId) return { error: "Faculty is required" };

    await createCourse({ code, name, awardLevel, facultyId, awardingBody });
    revalidatePath("/admin/catalogue/courses");
    return null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "An error occurred" };
  }
}

export async function editCourseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdministrator();
    const id = formData.get("id") as string;
    const name = (formData.get("name") as string)?.trim();
    const awardLevel = formData.get("awardLevel") as AwardLevel;
    const facultyId = formData.get("facultyId") as string;
    const awardingBody = (formData.get("awardingBody") as string)?.trim() || null;

    if (!name) return { error: "Name is required" };
    if (!VALID_AWARD_LEVELS.includes(awardLevel)) return { error: "Invalid award level" };
    if (!facultyId) return { error: "Faculty is required" };

    await editCourse(id, { name, awardLevel, facultyId, awardingBody });
    revalidatePath("/admin/catalogue/courses");
    return null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "An error occurred" };
  }
}

export async function markCourseInactiveAction(id: string): Promise<void> {
  await requireAdministrator();
  await markCourseInactive(id);
  revalidatePath("/admin/catalogue/courses");
}

// ── Module ────────────────────────────────────────────────────────────────

export async function createModuleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdministrator();
    const code = (formData.get("code") as string)?.trim().toUpperCase();
    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || undefined;

    if (!code) return { error: "Module code is required" };
    if (!name) return { error: "Name is required" };

    await createModule({ code, name, description });
    revalidatePath("/admin/catalogue/modules");
    return null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "An error occurred" };
  }
}

export async function editModuleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdministrator();
    const id = formData.get("id") as string;
    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;

    if (!name) return { error: "Name is required" };

    await editModule(id, { name, description });
    revalidatePath("/admin/catalogue/modules");
    return null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "An error occurred" };
  }
}

export async function markModuleInactiveAction(id: string): Promise<void> {
  await requireAdministrator();
  await markModuleInactive(id);
  revalidatePath("/admin/catalogue/modules");
}

// ── Intake ────────────────────────────────────────────────────────────────

export async function createIntakeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdministrator();
    const name = (formData.get("name") as string)?.trim();
    if (!name) return { error: "Name is required" };
    await createIntake({ name });
    revalidatePath("/admin/catalogue/intakes");
    return null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "An error occurred" };
  }
}

export async function editIntakeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdministrator();
    const id = formData.get("id") as string;
    const name = (formData.get("name") as string)?.trim();
    if (!name) return { error: "Name is required" };
    await editIntake(id, { name });
    revalidatePath("/admin/catalogue/intakes");
    return null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "An error occurred" };
  }
}

export async function markIntakeInactiveAction(id: string): Promise<void> {
  await requireAdministrator();
  await markIntakeInactive(id);
  revalidatePath("/admin/catalogue/intakes");
}

// ── StudyMode ─────────────────────────────────────────────────────────────

export async function createStudyModeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdministrator();
    const name = (formData.get("name") as string)?.trim();
    if (!name) return { error: "Name is required" };
    await createStudyMode({ name });
    revalidatePath("/admin/catalogue/study-modes");
    return null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "An error occurred" };
  }
}

export async function editStudyModeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdministrator();
    const id = formData.get("id") as string;
    const name = (formData.get("name") as string)?.trim();
    if (!name) return { error: "Name is required" };
    await editStudyMode(id, { name });
    revalidatePath("/admin/catalogue/study-modes");
    return null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "An error occurred" };
  }
}

export async function markStudyModeInactiveAction(id: string): Promise<void> {
  await requireAdministrator();
  await markStudyModeInactive(id);
  revalidatePath("/admin/catalogue/study-modes");
}

// ── SessionType ───────────────────────────────────────────────────────────

export async function createSessionTypeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdministrator();
    const name = (formData.get("name") as string)?.trim();
    if (!name) return { error: "Name is required" };
    await createSessionType({ name });
    revalidatePath("/admin/catalogue/session-types");
    return null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "An error occurred" };
  }
}

export async function editSessionTypeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdministrator();
    const id = formData.get("id") as string;
    const name = (formData.get("name") as string)?.trim();
    if (!name) return { error: "Name is required" };
    await editSessionType(id, { name });
    revalidatePath("/admin/catalogue/session-types");
    return null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "An error occurred" };
  }
}

export async function markSessionTypeInactiveAction(id: string): Promise<void> {
  await requireAdministrator();
  await markSessionTypeInactive(id);
  revalidatePath("/admin/catalogue/session-types");
}
