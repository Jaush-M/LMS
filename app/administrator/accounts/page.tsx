import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccountRow } from "./account-row";

export default async function AdministratorAccountsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true, mustChangePassword: true },
  });

  if (!actor || actor.role !== "ADMINISTRATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const accounts = await prisma.userAccount.findMany({
    where: { role: { in: ["STUDENT", "EDUCATOR"] } },
    select: {
      id: true,
      generatedIdentifier: true,
      institutionalEmail: true,
      role: true,
      status: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Account Management</h1>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4 font-medium">Identifier</th>
              <th className="py-2 pr-4 font-medium">Institutional email</th>
              <th className="py-2 pr-4 font-medium">Role</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <AccountRow key={account.id} account={account} />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
