import { describe, it, expect, afterEach } from "vitest";
import { formatIdentifier, createAccount, activateAccount, disableAccount, reactivateAccount, changeTemporaryPassword } from "./accounts";
import { prisma } from "./prisma";

async function makeActive(userId: string) {
  await prisma.userAccount.update({
    where: { userId },
    data: { status: "ACTIVE" },
  });
}

async function getUserAccount(userId: string) {
  return prisma.userAccount.findUniqueOrThrow({ where: { userId } });
}

async function cleanupUsers(userIds: string[]) {
  if (userIds.length === 0) return;
  const accounts = await prisma.userAccount.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const accountIds = accounts.map((a) => a.id);
  await prisma.auditLogEntry.deleteMany({ where: { actorId: { in: accountIds } } });
  await prisma.userAccount.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

describe("formatIdentifier", () => {
  it("formats Administrator identifier with A prefix and 6-digit padding", () => {
    expect(formatIdentifier("ADMINISTRATOR", 1)).toBe("A000001");
  });

  it("sequences longer than 1 million remain correct", () => {
    expect(formatIdentifier("STUDENT", 999999)).toBe("S999999");
    expect(formatIdentifier("STUDENT", 1000000)).toBe("S1000000");
  });

  it.each([
    ["SUPER_ADMINISTRATOR", 1, "SA000001"],
    ["EDUCATOR", 1, "E000001"],
    ["STUDENT", 100, "S000100"],
  ] as const)(
    "formatIdentifier(%s, %d) → %s",
    (role, seq, expected) => {
      expect(formatIdentifier(role, seq)).toBe(expected);
    }
  );
});

describe("createAccount", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("derives institutional email from generated identifier", async () => {
    const result = await createAccount({ name: "Test Admin", role: "ADMINISTRATOR" });
    createdUserIds.push(result.userId);
    expect(result.institutionalEmail).toBe(`${result.identifier}@lms.edu.mv`);
  });

  it("assigns sequential identifiers per role", async () => {
    const first = await createAccount({ name: "Admin One", role: "ADMINISTRATOR" });
    const second = await createAccount({ name: "Admin Two", role: "ADMINISTRATOR" });
    createdUserIds.push(first.userId, second.userId);
    const firstSeq = parseInt(first.identifier.slice(1));
    const secondSeq = parseInt(second.identifier.slice(1));
    expect(secondSeq).toBe(firstSeq + 1);
  });

  it("identifier sequences are independent per role", async () => {
    const educator = await createAccount({ name: "Edu One", role: "EDUCATOR" });
    const student = await createAccount({ name: "Stu One", role: "STUDENT" });
    createdUserIds.push(educator.userId, student.userId);
    expect(educator.identifier).toMatch(/^E\d{6}$/);
    expect(student.identifier).toMatch(/^S\d{6}$/);
  });
});

describe("activateAccount", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("transitions an inactive user account to active", async () => {
    const actor = await createAccount({ name: "Admin Actor", role: "ADMINISTRATOR" });
    const target = await createAccount({ name: "Student Target", role: "STUDENT" });
    createdUserIds.push(actor.userId, target.userId);
    await makeActive(actor.userId);

    const actorAccount = await getUserAccount(actor.userId);
    const targetAccount = await getUserAccount(target.userId);
    await activateAccount(actorAccount.id, targetAccount.id);

    const updated = await getUserAccount(target.userId);
    expect(updated.status).toBe("ACTIVE");
  });

  it("writes a system audit log entry on activation", async () => {
    const actor = await createAccount({ name: "Admin Actor", role: "ADMINISTRATOR" });
    const target = await createAccount({ name: "Student Target", role: "STUDENT" });
    createdUserIds.push(actor.userId, target.userId);
    await makeActive(actor.userId);

    const actorAccount = await getUserAccount(actor.userId);
    const targetAccount = await getUserAccount(target.userId);
    await activateAccount(actorAccount.id, targetAccount.id);

    const entry = await prisma.auditLogEntry.findFirst({
      where: { actorId: actorAccount.id, action: "ACCOUNT_ACTIVATED" },
    });
    expect(entry).not.toBeNull();
    expect(entry!.eventType).toBe("SYSTEM");
    expect(entry!.entityType).toBe("UserAccount");
    expect(entry!.entityId).toBe(targetAccount.id);
    expect(JSON.parse(entry!.beforeJson!)).toMatchObject({ status: "INACTIVE" });
    expect(JSON.parse(entry!.afterJson!)).toMatchObject({ status: "ACTIVE" });
  });

  it("throws when Administrator tries to activate another Administrator", async () => {
    const actor = await createAccount({ name: "Admin Actor", role: "ADMINISTRATOR" });
    const target = await createAccount({ name: "Admin Target", role: "ADMINISTRATOR" });
    createdUserIds.push(actor.userId, target.userId);
    await makeActive(actor.userId);

    const actorAccount = await getUserAccount(actor.userId);
    const targetAccount = await getUserAccount(target.userId);
    await expect(activateAccount(actorAccount.id, targetAccount.id)).rejects.toThrow("Unauthorized");
  });

  it("Super Administrator can activate an Administrator", async () => {
    const actor = await createAccount({ name: "SA Actor", role: "SUPER_ADMINISTRATOR" });
    const target = await createAccount({ name: "Admin Target", role: "ADMINISTRATOR" });
    createdUserIds.push(actor.userId, target.userId);
    await makeActive(actor.userId);

    const actorAccount = await getUserAccount(actor.userId);
    const targetAccount = await getUserAccount(target.userId);
    await activateAccount(actorAccount.id, targetAccount.id);

    const updated = await getUserAccount(target.userId);
    expect(updated.status).toBe("ACTIVE");
  });

  it("throws when target is already active", async () => {
    const actor = await createAccount({ name: "Admin Actor", role: "ADMINISTRATOR" });
    const target = await createAccount({ name: "Student Target", role: "STUDENT" });
    createdUserIds.push(actor.userId, target.userId);
    await makeActive(actor.userId);
    await makeActive(target.userId);

    const actorAccount = await getUserAccount(actor.userId);
    const targetAccount = await getUserAccount(target.userId);
    await expect(activateAccount(actorAccount.id, targetAccount.id)).rejects.toThrow();
  });
});

describe("disableAccount", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("transitions an active user account to disabled", async () => {
    const actor = await createAccount({ name: "Admin Actor", role: "ADMINISTRATOR" });
    const target = await createAccount({ name: "Student Target", role: "STUDENT" });
    createdUserIds.push(actor.userId, target.userId);
    await makeActive(actor.userId);
    await makeActive(target.userId);

    const actorAccount = await getUserAccount(actor.userId);
    const targetAccount = await getUserAccount(target.userId);
    await disableAccount(actorAccount.id, targetAccount.id);

    const updated = await getUserAccount(target.userId);
    expect(updated.status).toBe("DISABLED");
  });

  it("writes a system audit log entry on disable", async () => {
    const actor = await createAccount({ name: "Admin Actor", role: "ADMINISTRATOR" });
    const target = await createAccount({ name: "Student Target", role: "STUDENT" });
    createdUserIds.push(actor.userId, target.userId);
    await makeActive(actor.userId);
    await makeActive(target.userId);

    const actorAccount = await getUserAccount(actor.userId);
    const targetAccount = await getUserAccount(target.userId);
    await disableAccount(actorAccount.id, targetAccount.id);

    const entry = await prisma.auditLogEntry.findFirst({
      where: { actorId: actorAccount.id, action: "ACCOUNT_DISABLED" },
    });
    expect(entry).not.toBeNull();
    expect(JSON.parse(entry!.beforeJson!)).toMatchObject({ status: "ACTIVE" });
    expect(JSON.parse(entry!.afterJson!)).toMatchObject({ status: "DISABLED" });
  });

  it("throws when Administrator tries to disable another Administrator", async () => {
    const actor = await createAccount({ name: "Admin Actor", role: "ADMINISTRATOR" });
    const target = await createAccount({ name: "Admin Target", role: "ADMINISTRATOR" });
    createdUserIds.push(actor.userId, target.userId);
    await makeActive(actor.userId);
    await makeActive(target.userId);

    const actorAccount = await getUserAccount(actor.userId);
    const targetAccount = await getUserAccount(target.userId);
    await expect(disableAccount(actorAccount.id, targetAccount.id)).rejects.toThrow("Unauthorized");
  });

  it("throws when target is already disabled", async () => {
    const actor = await createAccount({ name: "Admin Actor", role: "ADMINISTRATOR" });
    const target = await createAccount({ name: "Student Target", role: "STUDENT" });
    createdUserIds.push(actor.userId, target.userId);
    await makeActive(actor.userId);
    await prisma.userAccount.update({
      where: { userId: target.userId },
      data: { status: "DISABLED" },
    });

    const actorAccount = await getUserAccount(actor.userId);
    const targetAccount = await getUserAccount(target.userId);
    await expect(disableAccount(actorAccount.id, targetAccount.id)).rejects.toThrow();
  });
});

describe("reactivateAccount", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("transitions a disabled user account to active", async () => {
    const actor = await createAccount({ name: "Admin Actor", role: "ADMINISTRATOR" });
    const target = await createAccount({ name: "Student Target", role: "STUDENT" });
    createdUserIds.push(actor.userId, target.userId);
    await makeActive(actor.userId);
    await prisma.userAccount.update({
      where: { userId: target.userId },
      data: { status: "DISABLED" },
    });

    const actorAccount = await getUserAccount(actor.userId);
    const targetAccount = await getUserAccount(target.userId);
    await reactivateAccount(actorAccount.id, targetAccount.id);

    const updated = await getUserAccount(target.userId);
    expect(updated.status).toBe("ACTIVE");
  });

  it("writes a system audit log entry on reactivation", async () => {
    const actor = await createAccount({ name: "Admin Actor", role: "ADMINISTRATOR" });
    const target = await createAccount({ name: "Student Target", role: "STUDENT" });
    createdUserIds.push(actor.userId, target.userId);
    await makeActive(actor.userId);
    await prisma.userAccount.update({
      where: { userId: target.userId },
      data: { status: "DISABLED" },
    });

    const actorAccount = await getUserAccount(actor.userId);
    const targetAccount = await getUserAccount(target.userId);
    await reactivateAccount(actorAccount.id, targetAccount.id);

    const entry = await prisma.auditLogEntry.findFirst({
      where: { actorId: actorAccount.id, action: "ACCOUNT_REACTIVATED" },
    });
    expect(entry).not.toBeNull();
    expect(JSON.parse(entry!.beforeJson!)).toMatchObject({ status: "DISABLED" });
    expect(JSON.parse(entry!.afterJson!)).toMatchObject({ status: "ACTIVE" });
  });

  it("throws when target is not disabled", async () => {
    const actor = await createAccount({ name: "Admin Actor", role: "ADMINISTRATOR" });
    const target = await createAccount({ name: "Student Target", role: "STUDENT" });
    createdUserIds.push(actor.userId, target.userId);
    await makeActive(actor.userId);
    await makeActive(target.userId);

    const actorAccount = await getUserAccount(actor.userId);
    const targetAccount = await getUserAccount(target.userId);
    await expect(reactivateAccount(actorAccount.id, targetAccount.id)).rejects.toThrow();
  });
});

describe("changeTemporaryPassword", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("clears mustChangePassword after password change", async () => {
    const created = await createAccount({ name: "Student", role: "STUDENT" });
    createdUserIds.push(created.userId);

    await changeTemporaryPassword(created.userId, "NewSecurePass99!");

    const updated = await getUserAccount(created.userId);
    expect(updated.mustChangePassword).toBe(false);
  });

  it("updates the stored password hash so the new password is accepted", async () => {
    const { verifyPassword } = await import("better-auth/crypto");
    const created = await createAccount({ name: "Student", role: "STUDENT" });
    createdUserIds.push(created.userId);

    await changeTemporaryPassword(created.userId, "NewSecurePass99!");

    const authAccount = await prisma.account.findFirstOrThrow({
      where: { userId: created.userId },
    });
    const valid = await verifyPassword({ hash: authAccount.password!, password: "NewSecurePass99!" });
    expect(valid).toBe(true);
  });
});
