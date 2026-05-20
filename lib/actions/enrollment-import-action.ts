"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  commitEnrollmentCsvImport,
  previewEnrollmentCsvImport,
  type CommitEnrollmentCsvImportResult,
  type EnrollmentCsvImportPreview,
} from "@/lib/enrollment";

export type EnrollmentImportState = {
  error?: string;
  preview?: EnrollmentCsvImportPreview & {
    courseOfferingId: string;
    csvText: string;
    createMissingAccounts: boolean;
  };
  result?: CommitEnrollmentCsvImportResult;
} | null;

async function requireAdministrator() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const actor = await prisma.userAccount.findUniqueOrThrow({
    where: { userId: session.user.id },
    select: { id: true, role: true },
  });
  if (actor.role !== "ADMINISTRATOR") throw new Error("Unauthorized");
  return actor;
}

async function readCsvText(formData: FormData): Promise<string> {
  const csvFile = formData.get("csvFile");
  if (csvFile instanceof File && csvFile.size > 0) {
    return csvFile.text();
  }

  return ((formData.get("csvText") as string) ?? "").trim();
}

export async function previewEnrollmentCsvImportAction(
  _prev: EnrollmentImportState,
  formData: FormData
): Promise<EnrollmentImportState> {
  try {
    await requireAdministrator();

    const courseOfferingId = (formData.get("courseOfferingId") as string) ?? "";
    const createMissingAccounts = formData.get("createMissingAccounts") === "on";
    const csvText = await readCsvText(formData);

    if (!courseOfferingId) return { error: "Course Offering is required" };
    if (!csvText) return { error: "CSV file or CSV text is required" };

    const preview = await previewEnrollmentCsvImport({
      courseOfferingId,
      csvText,
      createMissingAccounts,
    });

    return { preview: { ...preview, courseOfferingId, csvText, createMissingAccounts } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Enrollment CSV preview failed" };
  }
}

export async function commitEnrollmentCsvImportAction(
  _prev: EnrollmentImportState,
  formData: FormData
): Promise<EnrollmentImportState> {
  try {
    const actor = await requireAdministrator();
    const courseOfferingId = (formData.get("courseOfferingId") as string) ?? "";
    const csvText = ((formData.get("csvText") as string) ?? "").trim();
    const createMissingAccounts = formData.get("createMissingAccounts") === "true";

    if (!courseOfferingId) return { error: "Course Offering is required" };
    if (!csvText) return { error: "CSV preview is required before commit" };

    const result = await commitEnrollmentCsvImport({
      courseOfferingId,
      csvText,
      createMissingAccounts,
      enrolledById: actor.id,
    });

    revalidatePath("/admin/enrollment-import");
    return { result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Enrollment CSV commit failed" };
  }
}
