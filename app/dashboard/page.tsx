import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const roleRoutes = {
  SUPER_ADMINISTRATOR: "/admin/dashboard",
  ADMINISTRATOR: "/admin/dashboard",
  EDUCATOR: "/educator/dashboard",
  STUDENT: "/student/dashboard",
} as const;

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  const userAccount = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true, mustChangePassword: true },
  });

  if (!userAccount) {
    redirect("/sign-in");
  }

  if (userAccount.mustChangePassword) {
    redirect("/change-password");
  }

  redirect(roleRoutes[userAccount.role]);
}
