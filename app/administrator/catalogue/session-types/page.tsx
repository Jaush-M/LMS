import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listSessionTypes } from "@/lib/catalogue";
import { SessionTypeRow } from "./session-type-row";
import { CreateSessionTypeForm } from "./create-session-type-form";
import Link from "next/link";

export default async function SessionTypesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true, mustChangePassword: true },
  });
  if (!actor || actor.role !== "ADMINISTRATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const types = await listSessionTypes({ includeInactive: true });

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/administrator/catalogue" className="text-sm text-gray-500 hover:underline">← Catalogue</Link>
        <h1 className="text-2xl font-semibold">Session Types</h1>
      </div>
      <CreateSessionTypeForm />
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {types.map((t) => <SessionTypeRow key={t.id} type={t} />)}
        </tbody>
      </table>
    </main>
  );
}
