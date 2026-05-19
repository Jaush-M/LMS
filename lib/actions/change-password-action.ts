"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { changeTemporaryPassword } from "@/lib/accounts";

export type ChangePasswordState = { error?: string } | null;

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const userAccount = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { mustChangePassword: true },
  });
  if (!userAccount?.mustChangePassword) return { error: "No password change required" };

  const newPassword = (formData.get("newPassword") as string)?.trim();
  const confirmPassword = (formData.get("confirmPassword") as string)?.trim();

  if (!newPassword || newPassword.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  await changeTemporaryPassword(session.user.id, newPassword);
  redirect("/dashboard");
}
