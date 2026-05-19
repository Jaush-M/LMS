import { hashPassword } from "better-auth/crypto";
import { prisma } from "./prisma";
import type { UserRole } from "./generated/prisma/enums";

const ROLE_PREFIX: Record<UserRole, string> = {
  SUPER_ADMINISTRATOR: "SA",
  ADMINISTRATOR: "A",
  EDUCATOR: "E",
  STUDENT: "S",
};

export function formatIdentifier(role: UserRole, seq: number): string {
  return `${ROLE_PREFIX[role]}${String(seq).padStart(6, "0")}`;
}

async function nextSeqForRole(role: UserRole): Promise<number> {
  const records = await prisma.userAccount.findMany({
    where: { role },
    select: { generatedIdentifier: true },
  });
  if (records.length === 0) return 1;
  const prefix = ROLE_PREFIX[role];
  const seqs = records.map((r) => parseInt(r.generatedIdentifier.slice(prefix.length), 10));
  return Math.max(...seqs) + 1;
}

function generateTemporaryPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export async function createAccount(params: {
  name: string;
  role: "ADMINISTRATOR" | "EDUCATOR" | "STUDENT";
}): Promise<{
  userId: string;
  identifier: string;
  institutionalEmail: string;
  temporaryPassword: string;
}> {
  const seq = await nextSeqForRole(params.role);
  const identifier = formatIdentifier(params.role, seq);
  const institutionalEmail = `${identifier}@lms.edu.mv`;
  const authEmail = institutionalEmail.toLowerCase();
  const temporaryPassword = generateTemporaryPassword();
  const userId = crypto.randomUUID();
  const now = new Date();
  const hash = await hashPassword(temporaryPassword);

  await prisma.$transaction([
    prisma.user.create({
      data: {
        id: userId,
        name: params.name,
        email: authEmail,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      },
    }),
    prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: hash,
        createdAt: now,
        updatedAt: now,
      },
    }),
    prisma.userAccount.create({
      data: {
        userId,
        role: params.role,
        generatedIdentifier: identifier,
        institutionalEmail,
        status: "INACTIVE",
        mustChangePassword: true,
      },
    }),
  ]);

  return { userId, identifier, institutionalEmail, temporaryPassword };
}
