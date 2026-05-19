"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { createAccount } from "@/lib/accounts";

export type CreateAccountState = {
  error?: string;
  result?: {
    identifier: string;
    institutionalEmail: string;
    temporaryPassword: string;
  };
} | null;

export async function createAdministratorAction(
  _prev: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const userAccount = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true },
  });
  if (!userAccount || userAccount.role !== "SUPER_ADMINISTRATOR") {
    return { error: "Unauthorized" };
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name is required" };

  const { identifier, institutionalEmail, temporaryPassword } =
    await createAccount({ name, role: "ADMINISTRATOR" });

  return { result: { identifier, institutionalEmail, temporaryPassword } };
}

export async function createStudentOrEducatorAction(
  _prev: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const userAccount = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true },
  });
  if (!userAccount || userAccount.role !== "ADMINISTRATOR") {
    return { error: "Unauthorized" };
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name is required" };

  const roleInput = formData.get("role") as string;
  if (roleInput !== "STUDENT" && roleInput !== "EDUCATOR") {
    return { error: "Invalid role selected" };
  }

  const { identifier, institutionalEmail, temporaryPassword } =
    await createAccount({ name, role: roleInput });

  return { result: { identifier, institutionalEmail, temporaryPassword } };
}
