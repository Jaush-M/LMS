import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdministratorDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const userAccount = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true, mustChangePassword: true },
  });

  if (!userAccount || userAccount.role !== "ADMINISTRATOR") {
    redirect("/dashboard");
  }

  if (userAccount.mustChangePassword) redirect("/change-password");

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Administrator Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome, {session.user.name}</p>
      <nav className="mt-6 space-x-4">
        <Link href="/administrator/create-account" className="text-blue-600 underline">
          Create account
        </Link>
        <Link href="/administrator/accounts" className="text-blue-600 underline">
          Manage accounts
        </Link>
      </nav>
    </main>
  );
}
