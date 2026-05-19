import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.session.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.systemSettings.deleteMany();
  await prisma.userAccount.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  console.log("Teardown complete — all auth/user rows deleted");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
