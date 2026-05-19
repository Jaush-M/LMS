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

function assertCanManage(actorRole: string, targetRole: string) {
  if (actorRole === "STUDENT" || actorRole === "EDUCATOR") throw new Error("Unauthorized");
  if (actorRole === "ADMINISTRATOR" && targetRole !== "STUDENT" && targetRole !== "EDUCATOR") {
    throw new Error("Unauthorized");
  }
}

export async function activateAccount(actorId: string, targetId: string): Promise<void> {
  const [actor, target] = await Promise.all([
    prisma.userAccount.findUniqueOrThrow({ where: { id: actorId } }),
    prisma.userAccount.findUniqueOrThrow({ where: { id: targetId } }),
  ]);

  assertCanManage(actor.role, target.role);

  if (target.status !== "INACTIVE") {
    throw new Error(`Cannot activate a user account with status ${target.status}`);
  }

  await prisma.$transaction([
    prisma.userAccount.update({ where: { id: targetId }, data: { status: "ACTIVE" } }),
    prisma.auditLogEntry.create({
      data: {
        eventType: "SYSTEM",
        action: "ACCOUNT_ACTIVATED",
        actorId,
        entityType: "UserAccount",
        entityId: targetId,
        beforeJson: JSON.stringify({ status: "INACTIVE" }),
        afterJson: JSON.stringify({ status: "ACTIVE" }),
      },
    }),
  ]);
}

export async function disableAccount(actorId: string, targetId: string): Promise<void> {
  const [actor, target] = await Promise.all([
    prisma.userAccount.findUniqueOrThrow({ where: { id: actorId } }),
    prisma.userAccount.findUniqueOrThrow({ where: { id: targetId } }),
  ]);

  assertCanManage(actor.role, target.role);

  if (target.status !== "ACTIVE") {
    throw new Error(`Cannot disable a user account with status ${target.status}`);
  }

  await prisma.$transaction([
    prisma.userAccount.update({ where: { id: targetId }, data: { status: "DISABLED" } }),
    prisma.auditLogEntry.create({
      data: {
        eventType: "SYSTEM",
        action: "ACCOUNT_DISABLED",
        actorId,
        entityType: "UserAccount",
        entityId: targetId,
        beforeJson: JSON.stringify({ status: "ACTIVE" }),
        afterJson: JSON.stringify({ status: "DISABLED" }),
      },
    }),
  ]);
}

export async function changeTemporaryPassword(userId: string, newPassword: string): Promise<void> {
  const hash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.account.updateMany({
      where: { userId, providerId: "credential" },
      data: { password: hash },
    }),
    prisma.userAccount.update({
      where: { userId },
      data: { mustChangePassword: false },
    }),
  ]);
}

export async function reactivateAccount(actorId: string, targetId: string): Promise<void> {
  const [actor, target] = await Promise.all([
    prisma.userAccount.findUniqueOrThrow({ where: { id: actorId } }),
    prisma.userAccount.findUniqueOrThrow({ where: { id: targetId } }),
  ]);

  assertCanManage(actor.role, target.role);

  if (target.status !== "DISABLED") {
    throw new Error(`Cannot reactivate a user account with status ${target.status}`);
  }

  await prisma.$transaction([
    prisma.userAccount.update({ where: { id: targetId }, data: { status: "ACTIVE" } }),
    prisma.auditLogEntry.create({
      data: {
        eventType: "SYSTEM",
        action: "ACCOUNT_REACTIVATED",
        actorId,
        entityType: "UserAccount",
        entityId: targetId,
        beforeJson: JSON.stringify({ status: "DISABLED" }),
        afterJson: JSON.stringify({ status: "ACTIVE" }),
      },
    }),
  ]);
}
