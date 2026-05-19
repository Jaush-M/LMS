import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const TEMP_PASSWORD = "TempPass123!";

async function createAuthUser(params: {
  id: string;
  name: string;
  email: string;
  password: string;
}) {
  const hash = await hashPassword(params.password);
  const now = new Date();

  await prisma.user.create({
    data: {
      id: params.id,
      name: params.name,
      email: params.email,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: params.id,
      providerId: "credential",
      userId: params.id,
      password: hash,
      createdAt: now,
      updatedAt: now,
    },
  });
}

async function main() {
  const saId = crypto.randomUUID();
  const inactiveId = crypto.randomUUID();

  // Super Administrator — ACTIVE, must change password
  await createAuthUser({
    id: saId,
    name: "Super Administrator",
    email: "superadmin@lms.local",
    password: TEMP_PASSWORD,
  });
  await prisma.userAccount.create({
    data: {
      userId: saId,
      role: "SUPER_ADMINISTRATOR",
      generatedIdentifier: "SA001",
      institutionalEmail: "superadmin@lms.local",
      status: "ACTIVE",
      mustChangePassword: true,
    },
  });

  // Inactive user — cannot sign in
  await createAuthUser({
    id: inactiveId,
    name: "Inactive Student",
    email: "inactive@lms.local",
    password: TEMP_PASSWORD,
  });
  await prisma.userAccount.create({
    data: {
      userId: inactiveId,
      role: "STUDENT",
      generatedIdentifier: "S001",
      institutionalEmail: "inactive@lms.local",
      status: "INACTIVE",
      mustChangePassword: true,
    },
  });

  console.log("Seed complete");
  console.log(`Super Administrator: superadmin@lms.local / ${TEMP_PASSWORD}`);
  console.log(`Inactive student:    inactive@lms.local / ${TEMP_PASSWORD}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
