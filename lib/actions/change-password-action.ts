"use server";

import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-guard";
import { changeTemporaryPassword } from "@/lib/accounts";

export type ChangePasswordState = { error?: string } | null;

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  // Use getAuthContext (not requireAuthRedirect) to avoid infinite redirect loop —
  // requireAuthRedirect redirects to /change-password when mustChangePassword is true.
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };
  if (!ctx.account.mustChangePassword) return { error: "No password change required" };

  const newPassword = (formData.get("newPassword") as string)?.trim();
  const confirmPassword = (formData.get("confirmPassword") as string)?.trim();

  if (!newPassword || newPassword.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  await changeTemporaryPassword(ctx.user.id, newPassword);
  redirect("/dashboard");
}
