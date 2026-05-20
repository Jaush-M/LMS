"use server";

import { revalidatePath } from "next/cache";
import { requireAuthAction } from "@/lib/auth-guard";
import { activateAccount, disableAccount, reactivateAccount } from "@/lib/accounts";

export async function activateAccountAction(targetId: string): Promise<void> {
  const { account } = await requireAuthAction({ minRole: "ADMINISTRATOR" });
  await activateAccount(account.id, targetId);
  revalidatePath("/admin/accounts");
}

export async function disableAccountAction(targetId: string): Promise<void> {
  const { account } = await requireAuthAction({ minRole: "ADMINISTRATOR" });
  await disableAccount(account.id, targetId);
  revalidatePath("/admin/accounts");
}

export async function reactivateAccountAction(targetId: string): Promise<void> {
  const { account } = await requireAuthAction({ minRole: "ADMINISTRATOR" });
  await reactivateAccount(account.id, targetId);
  revalidatePath("/admin/accounts");
}
