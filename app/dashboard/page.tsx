import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-guard";

const roleRoutes = {
  SUPER_ADMINISTRATOR: "/admin/dashboard",
  ADMINISTRATOR: "/admin/dashboard",
  EDUCATOR: "/educator/dashboard",
  STUDENT: "/student/dashboard",
} as const;

export default async function DashboardPage() {
  const ctx = await getAuthContext();

  if (!ctx) redirect("/sign-in");
  if (ctx.account.mustChangePassword) redirect("/change-password");

  redirect(roleRoutes[ctx.account.role]);
}
