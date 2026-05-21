"use server";

import { redirect } from "next/navigation";
import { requireAuthRedirect } from "@/lib/auth-guard";
import { createCourseOfferingFromTemplate, activateCourseOffering, cancelCourseOffering, archiveCourseOffering } from "@/lib/course-offering";
import { enrollStudent } from "@/lib/enrollment";

// ── createCourseOfferingAction ────────────────────────────────────────────────

export type CreateCourseOfferingState = { error: string } | null;

export async function createCourseOfferingAction(
  _prev: CreateCourseOfferingState,
  formData: FormData
): Promise<CreateCourseOfferingState> {
  await requireAuthRedirect({ minRole: "ADMINISTRATOR" });

  try {
    const curriculumTemplateId = formData.get("curriculumTemplateId") as string;
    const intakeId = formData.get("intakeId") as string;
    const studyModeId = formData.get("studyModeId") as string;
    const name = formData.get("name") as string;
    const startAt = new Date(formData.get("startAt") as string);
    const finishAt = new Date(formData.get("finishAt") as string);
    const capacity = Number(formData.get("capacity") ?? 24);

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

    redirect(`/admin/course-offerings/${offering.id}`);
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
  const { account } = await requireAuthRedirect({ minRole: "ADMINISTRATOR" });

  try {
    const studentId = formData.get("studentId") as string;
    const courseOfferingId = formData.get("courseOfferingId") as string;
    const overrideReason = (formData.get("overrideReason") as string | null)?.trim() || null;

    const result = await enrollStudent({
      studentId,
      courseOfferingId,
      enrolledById: account.id,
      isMainEnrollment: true,
      capacityOverride: overrideReason ? { reason: overrideReason } : undefined,
    });

    if (result.status === "capacity_exceeded") {
      return { status: "capacity_exceeded", currentCount: result.currentCount, capacity: result.capacity };
    }

    redirect(`/admin/course-offerings/${courseOfferingId}`);
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { status: "error", error: error instanceof Error ? error.message : "Enrollment failed" };
  }
}

// ── activateCourseOfferingAction ──────────────────────────────────────────────

export type ActivateCourseOfferingState = { error: string } | null;

export async function activateCourseOfferingAction(
  _prev: ActivateCourseOfferingState,
  formData: FormData
): Promise<ActivateCourseOfferingState> {
  const { account } = await requireAuthRedirect({ minRole: "ADMINISTRATOR" });

  try {
    const courseOfferingId = formData.get("courseOfferingId") as string;
    await activateCourseOffering({ courseOfferingId, activatedById: account.id });
    redirect(`/admin/course-offerings/${courseOfferingId}`);
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { error: error instanceof Error ? error.message : "Activation failed" };
  }
}

// ── cancelCourseOfferingAction ────────────────────────────────────────────────

export type CancelCourseOfferingState = { error: string } | null;

export async function cancelCourseOfferingAction(
  _prev: CancelCourseOfferingState,
  formData: FormData
): Promise<CancelCourseOfferingState> {
  const { account } = await requireAuthRedirect({ minRole: "ADMINISTRATOR" });

  try {
    const courseOfferingId = formData.get("courseOfferingId") as string;
    await cancelCourseOffering({ courseOfferingId, cancelledById: account.id });
    redirect(`/admin/course-offerings/${courseOfferingId}`);
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { error: error instanceof Error ? error.message : "Cancellation failed" };
  }
}

// ── archiveCourseOfferingAction ───────────────────────────────────────────────

export type ArchiveCourseOfferingState = { error: string } | null;

export async function archiveCourseOfferingAction(
  _prev: ArchiveCourseOfferingState,
  formData: FormData
): Promise<ArchiveCourseOfferingState> {
  const { account } = await requireAuthRedirect({ minRole: "ADMINISTRATOR" });

  try {
    const courseOfferingId = formData.get("courseOfferingId") as string;

    await archiveCourseOffering({ courseOfferingId, archivedById: account.id });

    redirect(`/admin/course-offerings/${courseOfferingId}`);
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { error: error instanceof Error ? error.message : "Archive failed" };
  }
}
