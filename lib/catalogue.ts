import { prisma } from "./prisma";
import type { AwardLevel } from "./generated/prisma/enums";

// ── Faculty ───────────────────────────────────────────────────────────────

export async function createFaculty(params: { name: string }) {
  return prisma.faculty.create({ data: { name: params.name } });
}

export async function editFaculty(id: string, patch: { name: string }) {
  return prisma.faculty.update({ where: { id }, data: { name: patch.name } });
}

export async function markFacultyInactive(id: string) {
  const faculty = await prisma.faculty.findUniqueOrThrow({ where: { id } });
  if (faculty.status !== "ACTIVE") {
    throw new Error(`Cannot mark inactive: faculty status is ${faculty.status}`);
  }
  return prisma.faculty.update({ where: { id }, data: { status: "INACTIVE" } });
}

export async function listFaculties(options?: { includeInactive?: boolean }) {
  return prisma.faculty.findMany({
    where: options?.includeInactive ? undefined : { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
}

// ── Course ────────────────────────────────────────────────────────────────

export async function createCourse(params: {
  code: string;
  name: string;
  awardLevel: AwardLevel;
  facultyId: string;
  awardingBody?: string;
}) {
  const existing = await prisma.course.findUnique({ where: { code: params.code } });
  if (existing) throw new Error(`Course code "${params.code}" is already in use`);

  return prisma.course.create({
    data: {
      code: params.code,
      name: params.name,
      awardLevel: params.awardLevel,
      facultyId: params.facultyId,
      awardingBody: params.awardingBody ?? null,
    },
  });
}

export async function editCourse(
  id: string,
  patch: { name?: string; awardLevel?: AwardLevel; facultyId?: string; awardingBody?: string | null }
) {
  return prisma.course.update({ where: { id }, data: patch });
}

export async function markCourseInactive(id: string) {
  const course = await prisma.course.findUniqueOrThrow({ where: { id } });
  if (course.status !== "ACTIVE") {
    throw new Error(`Cannot mark inactive: course status is ${course.status}`);
  }
  return prisma.course.update({ where: { id }, data: { status: "INACTIVE" } });
}

export async function listCourses(options?: { includeInactive?: boolean }) {
  return prisma.course.findMany({
    where: options?.includeInactive ? undefined : { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
}

// ── Module ────────────────────────────────────────────────────────────────

export async function createModule(params: { code: string; name: string; description?: string }) {
  const existing = await prisma.module.findUnique({ where: { code: params.code } });
  if (existing) throw new Error(`Module code "${params.code}" is already in use`);

  return prisma.module.create({
    data: {
      code: params.code,
      name: params.name,
      description: params.description ?? null,
    },
  });
}

export async function editModule(id: string, patch: { name?: string; description?: string | null }) {
  return prisma.module.update({ where: { id }, data: patch });
}

export async function markModuleInactive(id: string) {
  const mod = await prisma.module.findUniqueOrThrow({ where: { id } });
  if (mod.status !== "ACTIVE") {
    throw new Error(`Cannot mark inactive: module status is ${mod.status}`);
  }
  return prisma.module.update({ where: { id }, data: { status: "INACTIVE" } });
}

export async function listModules(options?: { includeInactive?: boolean }) {
  return prisma.module.findMany({
    where: options?.includeInactive ? undefined : { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
}

// ── Intake ────────────────────────────────────────────────────────────────

export async function createIntake(params: { name: string }) {
  return prisma.intake.create({ data: { name: params.name } });
}

export async function editIntake(id: string, patch: { name: string }) {
  return prisma.intake.update({ where: { id }, data: { name: patch.name } });
}

export async function markIntakeInactive(id: string) {
  const intake = await prisma.intake.findUniqueOrThrow({ where: { id } });
  if (intake.status !== "ACTIVE") {
    throw new Error(`Cannot mark inactive: intake status is ${intake.status}`);
  }
  return prisma.intake.update({ where: { id }, data: { status: "INACTIVE" } });
}

export async function listIntakes(options?: { includeInactive?: boolean }) {
  return prisma.intake.findMany({
    where: options?.includeInactive ? undefined : { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
}

// ── StudyMode ─────────────────────────────────────────────────────────────

export async function createStudyMode(params: { name: string }) {
  return prisma.studyMode.create({ data: { name: params.name } });
}

export async function editStudyMode(id: string, patch: { name: string }) {
  return prisma.studyMode.update({ where: { id }, data: { name: patch.name } });
}

export async function markStudyModeInactive(id: string) {
  const mode = await prisma.studyMode.findUniqueOrThrow({ where: { id } });
  if (mode.status !== "ACTIVE") {
    throw new Error(`Cannot mark inactive: study mode status is ${mode.status}`);
  }
  return prisma.studyMode.update({ where: { id }, data: { status: "INACTIVE" } });
}

export async function listStudyModes(options?: { includeInactive?: boolean }) {
  return prisma.studyMode.findMany({
    where: options?.includeInactive ? undefined : { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
}

// ── SessionType ───────────────────────────────────────────────────────────

export async function createSessionType(params: { name: string }) {
  return prisma.sessionType.create({ data: { name: params.name } });
}

export async function editSessionType(id: string, patch: { name: string }) {
  return prisma.sessionType.update({ where: { id }, data: { name: patch.name } });
}

export async function markSessionTypeInactive(id: string) {
  const type = await prisma.sessionType.findUniqueOrThrow({ where: { id } });
  if (type.status !== "ACTIVE") {
    throw new Error(`Cannot mark inactive: session type status is ${type.status}`);
  }
  return prisma.sessionType.update({ where: { id }, data: { status: "INACTIVE" } });
}

export async function listSessionTypes(options?: { includeInactive?: boolean }) {
  return prisma.sessionType.findMany({
    where: options?.includeInactive ? undefined : { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
}
