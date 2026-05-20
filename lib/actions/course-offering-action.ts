"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createCourseOfferingFromTemplate, archiveCourseOffering } from "@/lib/course-offering";
import { enrollStudent } from "@/lib/enrollment";

async function requireAdministrator() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { id: true, role: true },
  });
  if (!actor || actor.role !== "ADMINISTRATOR") redirect("/dashboard");
  return actor;
}

// ── createCourseOfferingAction ────────────────────────────────────────────────

export type CreateCourseOfferingState = { error: string } | null;

export async function createCourseOfferingAction(
  _prev: CreateCourseOfferingState,
  formData: FormData
): Promise<CreateCourseOfferingState> {
  try {
    await requireAdministrator();

    const curriculumTemplateId = formData.get("curriculumTemplateId") as string;
    const intakeId = formData.get("intakeId") as string;
    const studyModeId = formData.get("studyModeId") as string;
    const name = formData.get("name") as string;
    const startAt = new Date(formData.get("startAt") as string);
    const finishAt = new Date(formData.get("finishAt") as string);
    const capacity = Number(formData.get("capacity") ?? 24);

    // collect per-template-module educator assignments
    const templateModuleIds = formData.getAll("templateModuleId") as string[];
    const primaryEducatorIds = formData.getAll("primaryEducatorId") as string[];

    if (templateModuleIds.length === 0) {
      return { error: "At least one module offering assignment is required" };
    }

    const moduleOfferings = templateModuleIds.map((tmId, i) => ({
      templateModuleId: tmId,
      primaryEducatorId: primaryEducatorIds[i] ?? "",
    }));

    const offering = await createCourseOfferingFromTemplate({
      curriculumTemplateId,
      intakeId,
      studyModeId,
      name,
      startAt,
      finishAt,
      capacity,
      moduleOfferings,
    });

    redirect(`/administrator/course-offerings/${offering.id}`);
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { error: error instanceof Error ? error.message : "Failed to create Course Offering" };
  }
}

// ── enrollStudentAction ───────────────────────────────────────────────────────

export type EnrollStudentState =
  | { status: "capacity_exceeded"; currentCount: number; capacity: number }
  | { status: "enrolled" }
  | { status: "error"; error: string }
  | null;

export async function enrollStudentAction(
  _prev: EnrollStudentState,
  formData: FormData
): Promise<EnrollStudentState> {
  try {
    const actor = await requireAdministrator();

    const studentId = formData.get("studentId") as string;
    const courseOfferingId = formData.get("courseOfferingId") as string;
    const overrideReason = (formData.get("overrideReason") as string | null)?.trim() || null;

    const result = await enrollStudent({
      studentId,
      courseOfferingId,
      enrolledById: actor.id,
      isMainEnrollment: true,
      capacityOverride: overrideReason ? { reason: overrideReason } : undefined,
    });

    if (result.status === "capacity_exceeded") {
      return { status: "capacity_exceeded", currentCount: result.currentCount, capacity: result.capacity };
    }

    redirect(`/administrator/course-offerings/${courseOfferingId}`);
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { status: "error", error: error instanceof Error ? error.message : "Enrollment failed" };
  }
}

// ── archiveCourseOfferingAction ───────────────────────────────────────────────

export type ArchiveCourseOfferingState = { error: string } | null;

export async function archiveCourseOfferingAction(
  _prev: ArchiveCourseOfferingState,
  formData: FormData
): Promise<ArchiveCourseOfferingState> {
  try {
    const actor = await requireAdministrator();
    const courseOfferingId = formData.get("courseOfferingId") as string;

    await archiveCourseOffering({ courseOfferingId, archivedById: actor.id });

    redirect(`/administrator/course-offerings/${courseOfferingId}`);
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { error: error instanceof Error ? error.message : "Archive failed" };
  }
}
