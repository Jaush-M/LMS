import { describe, it, expect, afterEach } from "vitest";
import { formatIdentifier, createAccount } from "./accounts";
import { prisma } from "./prisma";

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
    if (createdUserIds.length === 0) return;
    await prisma.userAccount.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    await prisma.account.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
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
