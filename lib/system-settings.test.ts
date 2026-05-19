import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getSystemSettings, updateSystemSettings } from "./system-settings";
import { prisma } from "./prisma";

async function cleanupSettings() {
  await prisma.auditLogEntry.deleteMany({ where: { entityType: "SystemSettings" } });
  await prisma.systemSettings.deleteMany();
}

beforeEach(cleanupSettings);
afterEach(cleanupSettings);

describe("getSystemSettings", () => {
  it("returns a row with default values on first call", async () => {
    const settings = await getSystemSettings();
    expect(settings.defaultReminderPeriodDays).toBe(15);
    expect(settings.passThresholdPercent).toBe(50);
    expect(settings.attendanceRiskThresholdPercent).toBe(80);
  });

  it("returns the same row on repeated calls", async () => {
    const first = await getSystemSettings();
    const second = await getSystemSettings();
    expect(first.id).toBe(second.id);
  });
});

describe("updateSystemSettings", () => {
  it("updates a named field", async () => {
    const actorAccount = await prisma.userAccount.findFirstOrThrow({
      where: { role: "SUPER_ADMINISTRATOR" },
    });

    await updateSystemSettings(actorAccount.id, { defaultReminderPeriodDays: 30 });

    const updated = await getSystemSettings();
    expect(updated.defaultReminderPeriodDays).toBe(30);
  });

  it("writes an audit log entry with before/after JSON", async () => {
    const actorAccount = await prisma.userAccount.findFirstOrThrow({
      where: { role: "SUPER_ADMINISTRATOR" },
    });

    await getSystemSettings();
    await updateSystemSettings(actorAccount.id, { passThresholdPercent: 60 }, "Board decision");

    const entry = await prisma.auditLogEntry.findFirst({
      where: { entityType: "SystemSettings", action: "SYSTEM_SETTING_UPDATED" },
    });
    expect(entry).not.toBeNull();
    expect(entry!.eventType).toBe("SYSTEM");
    expect(entry!.actorId).toBe(actorAccount.id);
    expect(entry!.reason).toBe("Board decision");
    const before = JSON.parse(entry!.beforeJson!);
    const after = JSON.parse(entry!.afterJson!);
    expect(before.passThresholdPercent).toBe(50);
    expect(after.passThresholdPercent).toBe(60);
  });

  it("throws when actor is not a Super Administrator", async () => {
    const adminAccount = await prisma.userAccount.findFirstOrThrow({
      where: { role: "ADMINISTRATOR" },
    });

    await expect(
      updateSystemSettings(adminAccount.id, { defaultReminderPeriodDays: 7 })
    ).rejects.toThrow("Unauthorized");
  });
});
