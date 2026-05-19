import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ModuleRow } from "./module-row";
import { CreateModuleForm } from "./create-module-form";
import Link from "next/link";

export default async function ModulesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true, mustChangePassword: true },
  });
  if (!actor || actor.role !== "ADMINISTRATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const modules = await prisma.module.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/administrator/catalogue" className="text-sm text-gray-500 hover:underline">
          ← Catalogue
        </Link>
        <h1 className="text-2xl font-semibold">Modules</h1>
      </div>

      <CreateModuleForm />

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4 font-medium">Code</th>
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {modules.map((m) => (
            <ModuleRow key={m.id} module={m} />
          ))}
        </tbody>
      </table>
    </main>
  );
}
