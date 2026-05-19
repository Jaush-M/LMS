import { prisma } from "./prisma";
import type { ExceptionType } from "./generated/prisma/enums";
import { createAccount } from "./accounts";

// ── calculateEffectiveModuleAccess ───────────────────────────────────────────

type ModuleOfferingRef = { id: string };
type ExceptionRef = { moduleOfferingId: string; exceptionType: ExceptionType | "INCLUDE" | "EXCLUDE" };

export function calculateEffectiveModuleAccess(
  activeModuleOfferings: ModuleOfferingRef[],
  exceptions: ExceptionRef[]
): ModuleOfferingRef[] {
  const excludedIds = new Set(
    exceptions.filter((e) => e.exceptionType === "EXCLUDE").map((e) => e.moduleOfferingId)
  );
  const includedIds = new Set(
    exceptions.filter((e) => e.exceptionType === "INCLUDE").map((e) => e.moduleOfferingId)
  );

  const base = activeModuleOfferings.filter((mo) => !excludedIds.has(mo.id));
  const existingIds = new Set(base.map((mo) => mo.id));

  for (const id of includedIds) {
    if (!existingIds.has(id)) {
      base.push({ id });
    }
  }

  return base;
}

// ── enrollStudent ─────────────────────────────────────────────────────────────

type EnrollStudentInput = {
  studentId: string;
  courseOfferingId: string;
  enrolledById: string;
  isMainEnrollment?: boolean;
  capacityOverride?: { reason: string };
};

type EnrollStudentResult =
  | { status: "enrolled"; enrollment: { id: string; studentId: string; courseOfferingId: string; isMainEnrollment: boolean; enrollmentStatus: string } }
  | { status: "capacity_exceeded"; currentCount: number; capacity: number };

export type EnrollmentCsvImportAction = "match_existing" | "create_account";

export type EnrollmentCsvImportValidRow = {
  rowNumber: number;
  studentIdentifier: string | null;
  institutionalEmail: string | null;
  name: string;
  action: EnrollmentCsvImportAction;
  studentId: string | null;
};

export type EnrollmentCsvImportInvalidRow = {
  rowNumber: number;
  studentIdentifier: string | null;
  institutionalEmail: string | null;
  name: string;
  errors: string[];
};

export type EnrollmentCsvImportPreview = {
  totalRows: number;
  validRows: EnrollmentCsvImportValidRow[];
  invalidRows: EnrollmentCsvImportInvalidRow[];
};

export type PreviewEnrollmentCsvImportInput = {
  courseOfferingId: string;
  csvText: string;
  createMissingAccounts?: boolean;
};

export type CommitEnrollmentCsvImportInput = PreviewEnrollmentCsvImportInput & {
  enrolledById: string;
};

export type CommitEnrollmentCsvImportResult = {
  enrolledRows: {
    rowNumber: number;
    studentId: string;
    enrollmentId: string;
    action: EnrollmentCsvImportAction;
  }[];
  skippedRows: EnrollmentCsvImportInvalidRow[];
  createdAccounts: {
    rowNumber: number;
    userId: string;
    userAccountId: string;
    identifier: string;
    institutionalEmail: string;
    temporaryPassword: string;
    name: string;
    role: "STUDENT";
  }[];
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  fields.push(current.trim());
  return fields;
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getCsvValue(row: string[], headerIndexes: Map<string, number>, aliases: string[]): string {
  for (const alias of aliases) {
    const index = headerIndexes.get(alias);
    if (index !== undefined) return row[index]?.trim() ?? "";
  }
  return "";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseEnrollmentCsv(csvText: string) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error("CSV must include a header row");
  }

  const headers = parseCsvLine(lines[0]);
  const headerIndexes = new Map(headers.map((header, index) => [normalizeHeader(header), index]));

  return lines.slice(1).map((line, index) => {
    const row = parseCsvLine(line);
    const institutionalEmail = getCsvValue(row, headerIndexes, ["institutionalemail", "email"]);

    return {
      rowNumber: index + 2,
      studentIdentifier: getCsvValue(row, headerIndexes, ["studentidentifier", "identifier", "studentid"]) || null,
      institutionalEmail: institutionalEmail ? normalizeEmail(institutionalEmail) : null,
      name: getCsvValue(row, headerIndexes, ["name", "studentname"]) || "",
    };
  });
}

// ── CSV enrollment import ───────────────────────────────────────────────────

export async function previewEnrollmentCsvImport(params: PreviewEnrollmentCsvImportInput): Promise<EnrollmentCsvImportPreview> {
  await prisma.courseOffering.findUniqueOrThrow({ where: { id: params.courseOfferingId } });

  const rows = parseEnrollmentCsv(params.csvText);
  const identifiers = rows.map((row) => row.studentIdentifier).filter((identifier): identifier is string => Boolean(identifier));
  const emails = rows.map((row) => row.institutionalEmail).filter((email): email is string => Boolean(email));

  const accounts = await prisma.userAccount.findMany({
    where: {
      role: "STUDENT",
      OR: [
        { generatedIdentifier: { in: identifiers } },
        ...emails.map((email) => ({ institutionalEmail: { equals: email, mode: "insensitive" as const } })),
      ],
    },
  });
  const accountsByIdentifier = new Map(accounts.map((account) => [account.generatedIdentifier, account]));
  const accountsByEmail = new Map(accounts.map((account) => [normalizeEmail(account.institutionalEmail), account]));
  const existingEnrollments = await prisma.enrollment.findMany({
    where: {
      courseOfferingId: params.courseOfferingId,
      studentId: { in: accounts.map((account) => account.id) },
    },
    select: { studentId: true },
  });
  const enrolledStudentIds = new Set(existingEnrollments.map((enrollment) => enrollment.studentId));

  const validRows: EnrollmentCsvImportValidRow[] = [];
  const invalidRows: EnrollmentCsvImportInvalidRow[] = [];

  for (const row of rows) {
    const errors: string[] = [];
    if (!row.studentIdentifier && !row.institutionalEmail) {
      errors.push("Student Identifier or Institutional Email is required");
    }
    if (row.institutionalEmail && !EMAIL_PATTERN.test(row.institutionalEmail)) {
      errors.push("Institutional Email must be a valid email address");
    }

    const account =
      (row.studentIdentifier ? accountsByIdentifier.get(row.studentIdentifier) : undefined) ??
      (row.institutionalEmail ? accountsByEmail.get(row.institutionalEmail) : undefined);

    if (errors.length > 0) {
      invalidRows.push({ ...row, errors });
      continue;
    }

    if (!account) {
      if (!params.createMissingAccounts) {
        invalidRows.push({ ...row, errors: ["Student account was not found"] });
        continue;
      }

      if (!row.name) {
        invalidRows.push({ ...row, errors: ["Name is required to create a Student account"] });
        continue;
      }

      validRows.push({
        ...row,
        action: "create_account",
        studentId: null,
      });
      continue;
    }

    if (enrolledStudentIds.has(account.id)) {
      invalidRows.push({ ...row, errors: ["Student is already enrolled in this Course Offering"] });
      continue;
    }

    validRows.push({
      ...row,
      institutionalEmail: account.institutionalEmail,
      action: "match_existing",
      studentId: account.id,
    });
  }

  return { totalRows: rows.length, validRows, invalidRows };
}

export async function commitEnrollmentCsvImport(params: CommitEnrollmentCsvImportInput): Promise<CommitEnrollmentCsvImportResult> {
  const preview = await previewEnrollmentCsvImport(params);
  const enrolledRows: CommitEnrollmentCsvImportResult["enrolledRows"] = [];
  const skippedRows: EnrollmentCsvImportInvalidRow[] = [...preview.invalidRows];
  const createdAccounts: CommitEnrollmentCsvImportResult["createdAccounts"] = [];

  for (const row of preview.validRows) {
    let studentId = row.studentId;

    if (row.action === "create_account") {
      const account = await createAccount({ name: row.name, role: "STUDENT" });
      const userAccount = await prisma.userAccount.findUniqueOrThrow({ where: { userId: account.userId } });
      studentId = userAccount.id;
      createdAccounts.push({
        rowNumber: row.rowNumber,
        userId: account.userId,
        userAccountId: userAccount.id,
        identifier: account.identifier,
        institutionalEmail: account.institutionalEmail,
        temporaryPassword: account.temporaryPassword,
        name: row.name,
        role: "STUDENT",
      });
    }

    if (!studentId) {
      skippedRows.push({ ...row, errors: ["Student account was not found"] });
      continue;
    }

    try {
      const result = await enrollStudent({
        studentId,
        courseOfferingId: params.courseOfferingId,
        enrolledById: params.enrolledById,
      });

      if (result.status === "capacity_exceeded") {
        skippedRows.push({
          rowNumber: row.rowNumber,
          studentIdentifier: row.studentIdentifier,
          institutionalEmail: row.institutionalEmail,
          name: row.name,
          errors: ["Course Offering capacity has been reached"],
        });
        continue;
      }

      enrolledRows.push({
        rowNumber: row.rowNumber,
        studentId,
        enrollmentId: result.enrollment.id,
        action: row.action,
      });
    } catch (error) {
      skippedRows.push({
        rowNumber: row.rowNumber,
        studentIdentifier: row.studentIdentifier,
        institutionalEmail: row.institutionalEmail,
        name: row.name,
        errors: [error instanceof Error ? error.message : "Enrollment failed"],
      });
    }
  }

  return { enrolledRows, skippedRows, createdAccounts };
}

export async function enrollStudent(params: EnrollStudentInput): Promise<EnrollStudentResult> {
  return prisma.$transaction(async (tx) => {
    const student = await tx.userAccount.findUniqueOrThrow({ where: { id: params.studentId } });
    if (student.role !== "STUDENT") {
      throw new Error("Only a Student account can be enrolled in a Course Offering");
    }

    const existing = await tx.enrollment.findUnique({
      where: { studentId_courseOfferingId: { studentId: params.studentId, courseOfferingId: params.courseOfferingId } },
    });
    if (existing) {
      throw new Error("Student is already enrolled in this Course Offering");
    }

    const courseOffering = await tx.courseOffering.findUniqueOrThrow({ where: { id: params.courseOfferingId } });
    const currentCount = await tx.enrollment.count({
      where: { courseOfferingId: params.courseOfferingId, status: "ACTIVE" },
    });

    if (currentCount >= courseOffering.capacity && !params.capacityOverride) {
      return { status: "capacity_exceeded" as const, currentCount, capacity: courseOffering.capacity };
    }

    if (params.isMainEnrollment) {
      await tx.enrollment.updateMany({
        where: { studentId: params.studentId, isMainEnrollment: true },
        data: { isMainEnrollment: false },
      });
    }

    const enrollment = await tx.enrollment.create({
      data: {
        studentId: params.studentId,
        courseOfferingId: params.courseOfferingId,
        enrolledById: params.enrolledById,
        isMainEnrollment: params.isMainEnrollment ?? false,
      },
    });

    if (params.capacityOverride) {
      await tx.capacityOverride.create({
        data: {
          enrollmentId: enrollment.id,
          reason: params.capacityOverride.reason,
          authorizedById: params.enrolledById,
        },
      });

      await tx.auditLogEntry.create({
        data: {
          eventType: "OPERATIONAL",
          action: "CAPACITY_OVERRIDE",
          actorId: params.enrolledById,
          entityType: "Enrollment",
          entityId: enrollment.id,
          reason: params.capacityOverride.reason,
        },
      });
    }

    return {
      status: "enrolled" as const,
      enrollment: {
        id: enrollment.id,
        studentId: enrollment.studentId,
        courseOfferingId: enrollment.courseOfferingId,
        isMainEnrollment: enrollment.isMainEnrollment,
        enrollmentStatus: enrollment.status,
      },
    };
  });
}

// ── createModuleEnrollmentException ─────────────────────────────────────────

type CreateModuleEnrollmentExceptionInput = {
  enrollmentId: string;
  moduleOfferingId: string;
  exceptionType: "INCLUDE" | "EXCLUDE";
  reason: string;
  createdById: string;
};

export async function createModuleEnrollmentException(params: CreateModuleEnrollmentExceptionInput) {
  return prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.findUniqueOrThrow({ where: { id: params.enrollmentId } });

    const moduleOffering = await tx.moduleOffering.findUniqueOrThrow({ where: { id: params.moduleOfferingId } });
    if (moduleOffering.courseOfferingId !== enrollment.courseOfferingId) {
      throw new Error("Module Offering does not belong to the enrollment's Course Offering");
    }

    const existing = await tx.moduleEnrollmentException.findUnique({
      where: {
        enrollmentId_moduleOfferingId: {
          enrollmentId: params.enrollmentId,
          moduleOfferingId: params.moduleOfferingId,
        },
      },
    });
    if (existing) {
      throw new Error("A Module Enrollment Exception already exists for this Module Offering in this Enrollment");
    }

    return tx.moduleEnrollmentException.create({
      data: {
        enrollmentId: params.enrollmentId,
        moduleOfferingId: params.moduleOfferingId,
        exceptionType: params.exceptionType,
        reason: params.reason,
        createdById: params.createdById,
      },
    });
  });
}

// ── setMainEnrollment ────────────────────────────────────────────────────────

export async function setMainEnrollment(enrollmentId: string) {
  return prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.findUniqueOrThrow({ where: { id: enrollmentId } });

    await tx.enrollment.updateMany({
      where: { studentId: enrollment.studentId, isMainEnrollment: true },
      data: { isMainEnrollment: false },
    });

    return tx.enrollment.update({
      where: { id: enrollmentId },
      data: { isMainEnrollment: true },
    });
  });
}

// ── bulkEnrollStudents ────────────────────────────────────────────────────────

type BulkEnrollInput = Omit<EnrollStudentInput, "studentId"> & { studentIds: string[] };

export async function bulkEnrollStudents(params: BulkEnrollInput) {
  const results = [];
  for (const studentId of params.studentIds) {
    results.push(await enrollStudent({ ...params, studentId }));
  }
  return results;
}
