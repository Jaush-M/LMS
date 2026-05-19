"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { activateAccount, disableAccount, reactivateAccount } from "@/lib/accounts";

async function requireActor(requiredRole: "ADMINISTRATOR" | "SUPER_ADMINISTRATOR") {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const actor = await prisma.userAccount.findUniqueOrThrow({
    where: { userId: session.user.id },
    select: { id: true, role: true },
  });

  if (actor.role !== requiredRole && actor.role !== "SUPER_ADMINISTRATOR") {
    throw new Error("Unauthorized");
  }

  return actor;
}

export async function activateAccountAction(targetId: string): Promise<void> {
  const actor = await requireActor("ADMINISTRATOR");
  await activateAccount(actor.id, targetId);
  revalidatePath("/administrator/accounts");
  revalidatePath("/super-administrator/accounts");
}

export async function disableAccountAction(targetId: string): Promise<void> {
  const actor = await requireActor("ADMINISTRATOR");
  await disableAccount(actor.id, targetId);
  revalidatePath("/administrator/accounts");
  revalidatePath("/super-administrator/accounts");
}

export async function reactivateAccountAction(targetId: string): Promise<void> {
  const actor = await requireActor("ADMINISTRATOR");
  await reactivateAccount(actor.id, targetId);
  revalidatePath("/administrator/accounts");
  revalidatePath("/super-administrator/accounts");
}
