import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function SuperAdministratorDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Super Administrator Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome, {session.user.name}</p>
    </main>
  );
}
