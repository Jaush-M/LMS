import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listFaculties } from "@/lib/catalogue";
import { FacultyRow } from "./faculty-row";
import { CreateFacultyForm } from "./create-faculty-form";
import Link from "next/link";

export default async function FacultiesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true, mustChangePassword: true },
  });
  if (!actor || actor.role !== "ADMINISTRATOR" && actor.role !== "SUPER_ADMINISTRATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const faculties = await listFaculties({ includeInactive: true });

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/catalogue" className="text-sm text-gray-500 hover:underline">
          ← Catalogue
        </Link>
        <h1 className="text-2xl font-semibold">Faculties</h1>
      </div>

      <CreateFacultyForm />

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {faculties.map((f) => (
            <FacultyRow key={f.id} faculty={f} />
          ))}
        </tbody>
      </table>
    </main>
  );
}
