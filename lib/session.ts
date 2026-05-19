import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return null;
  }

  const account = await prisma.userAccount.findUnique({
    where: { authUserId: session.user.id },
    include: {
      studentProfile: true,
      educatorProfile: true,
      administratorProfile: true,
    },
  });

  if (!account || account.status !== "ACTIVE") {
    return null;
  }

  return {
    session,
    account,
  };
}

export async function requireCurrentUser() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return currentUser;
}

export async function requireRoles(roles: string[]) {
  const currentUser = await requireCurrentUser();

  if (!roles.includes(currentUser.account.role)) {
    redirect("/dashboard");
  }

  return currentUser;
}
