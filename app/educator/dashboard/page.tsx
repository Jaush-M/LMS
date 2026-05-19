import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function EducatorDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const userAccount = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true },
  });

  if (!userAccount || userAccount.role !== "EDUCATOR") {
    redirect("/dashboard");
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Educator Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome, {session.user.name}</p>
    </main>
  );
}
