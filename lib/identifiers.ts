import type { LmsRole, PrismaClient } from "@prisma/client";

const prefixes: Record<LmsRole, string> = {
  STUDENT: "S",
  EDUCATOR: "E",
  ADMINISTRATOR: "A",
  SUPER_ADMINISTRATOR: "SA",
};

export function formatGeneratedIdentifier(role: LmsRole, value: number) {
  return `${prefixes[role]}${String(value).padStart(6, "0")}`;
}

export async function reserveGeneratedIdentifier(
  prisma: PrismaClient,
  role: LmsRole,
) {
  const counter = await prisma.identifierCounter.upsert({
    where: { role },
    update: { nextValue: { increment: 1 } },
    create: { role, nextValue: 2 },
  });

  return formatGeneratedIdentifier(role, counter.nextValue - 1);
}

export function emailForIdentifier(identifier: string) {
  return `${identifier}@lms.edu.mv`.toLowerCase();
}
