import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";
import { env } from "./env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL || `http://localhost:${env.APP_PORT || 3000}`,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const userAccount = await prisma.userAccount.findUnique({
            where: { userId: session.userId },
            select: { status: true },
          });
          if (!userAccount || userAccount.status !== "ACTIVE") return false;
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
