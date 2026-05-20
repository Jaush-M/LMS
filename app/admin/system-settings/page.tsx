import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSystemSettings } from "@/lib/system-settings";
import { SystemSettingsForm } from "./form";

export default async function SystemSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true, mustChangePassword: true },
  });

  if (!actor || actor.role !== "SUPER_ADMINISTRATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const settings = await getSystemSettings();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">System Settings</h1>
      <p className="mt-1 text-sm text-gray-600">
        Changes are logged to the Audit Log with before and after values.
      </p>
      <div className="mt-6">
        <SystemSettingsForm settings={settings} />
      </div>
    </main>
  );
}
