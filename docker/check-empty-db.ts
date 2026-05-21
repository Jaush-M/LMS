import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const count = await prisma.user.count();
await prisma.$disconnect();

// Exit 0 = empty (seeding needed), exit 1 = already has data
process.exit(count > 0 ? 1 : 0);
