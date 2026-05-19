import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "./form";

export default async function ChangePasswordPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const userAccount = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { mustChangePassword: true },
  });

  if (!userAccount?.mustChangePassword) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-full items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Change your password</h1>
          <p className="mt-1 text-sm text-gray-600">
            You must set a new password before continuing.
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
