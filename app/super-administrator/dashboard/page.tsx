import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const roleRoutes = {
  SUPER_ADMINISTRATOR: "/super-administrator/dashboard",
  ADMINISTRATOR: "/administrator/dashboard",
  EDUCATOR: "/educator/dashboard",
  STUDENT: "/student/dashboard",
} as const;

export default async function SuperAdministratorDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  const userAccount = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true },
  });

  if (!userAccount || userAccount.role !== "SUPER_ADMINISTRATOR") {
    redirect(userAccount ? roleRoutes[userAccount.role] : "/sign-in");
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Super Administrator Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome, {session.user.name}</p>
    </main>
  );
}
