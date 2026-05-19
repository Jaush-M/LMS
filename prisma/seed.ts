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
  authEmail: string;
  password: string;
}) {
  const hash = await hashPassword(params.password);
  const now = new Date();

  await prisma.user.create({
    data: {
      id: params.id,
      name: params.name,
      email: params.authEmail,
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

const accounts = [
  {
    name: "Super Administrator",
    role: "SUPER_ADMINISTRATOR" as const,
    generatedIdentifier: "SA000001",
    institutionalEmail: "SA000001@lms.edu.mv",
    status: "ACTIVE" as const,
  },
  {
    name: "Administrator",
    role: "ADMINISTRATOR" as const,
    generatedIdentifier: "A000001",
    institutionalEmail: "A000001@lms.edu.mv",
    status: "ACTIVE" as const,
  },
  {
    name: "Educator",
    role: "EDUCATOR" as const,
    generatedIdentifier: "E000001",
    institutionalEmail: "E000001@lms.edu.mv",
    status: "ACTIVE" as const,
  },
  {
    name: "Student",
    role: "STUDENT" as const,
    generatedIdentifier: "S000001",
    institutionalEmail: "S000001@lms.edu.mv",
    status: "ACTIVE" as const,
  },
  {
    name: "Inactive Student",
    role: "STUDENT" as const,
    generatedIdentifier: "S000002",
    institutionalEmail: "S000002@lms.edu.mv",
    status: "INACTIVE" as const,
  },
];

async function main() {
  for (const account of accounts) {
    const id = crypto.randomUUID();
    await createAuthUser({
      id,
      name: account.name,
      authEmail: account.institutionalEmail.toLowerCase(),
      password: TEMP_PASSWORD,
    });
    await prisma.userAccount.create({
      data: {
        userId: id,
        role: account.role,
        generatedIdentifier: account.generatedIdentifier,
        institutionalEmail: account.institutionalEmail,
        status: account.status,
        mustChangePassword: true,
      },
    });
  }

  console.log("Seed complete");
  console.log(`Super Administrator: SA000001@lms.edu.mv / ${TEMP_PASSWORD}`);
  console.log(`Administrator:       A000001@lms.edu.mv / ${TEMP_PASSWORD}`);
  console.log(`Educator:            E000001@lms.edu.mv / ${TEMP_PASSWORD}`);
  console.log(`Student:             S000001@lms.edu.mv / ${TEMP_PASSWORD}`);
  console.log(`Inactive student:    S000002@lms.edu.mv / ${TEMP_PASSWORD}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
