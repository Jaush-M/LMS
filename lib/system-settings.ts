import { prisma } from "./prisma";
import type { SystemSettings } from "./generated/prisma/client";

export type { SystemSettings };

export async function getSystemSettings(): Promise<SystemSettings> {
  const existing = await prisma.systemSettings.findFirst();
  if (existing) return existing;
  return prisma.systemSettings.create({ data: {} });
}

export async function updateSystemSettings(
  actorId: string,
  updates: Partial<Omit<SystemSettings, "id" | "updatedAt">>,
  reason?: string
): Promise<void> {
  const actor = await prisma.userAccount.findUniqueOrThrow({ where: { id: actorId } });
  if (actor.role !== "SUPER_ADMINISTRATOR") throw new Error("Unauthorized");

  const before = await getSystemSettings();

  const after = await prisma.systemSettings.update({
    where: { id: before.id },
    data: updates,
  });

  const changedKeys = Object.keys(updates);
  const beforeSnap: Record<string, unknown> = {};
  const afterSnap: Record<string, unknown> = {};
  for (const key of changedKeys) {
    beforeSnap[key] = (before as Record<string, unknown>)[key];
    afterSnap[key] = (after as Record<string, unknown>)[key];
  }

  await prisma.auditLogEntry.create({
    data: {
      eventType: "SYSTEM",
      action: "SYSTEM_SETTING_UPDATED",
      actorId,
      entityType: "SystemSettings",
      entityId: before.id,
      beforeJson: JSON.stringify(beforeSnap),
      afterJson: JSON.stringify(afterSnap),
      reason: reason ?? null,
    },
  });
}
