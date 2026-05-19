import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listStudyModes } from "@/lib/catalogue";
import { StudyModeRow } from "./study-mode-row";
import { CreateStudyModeForm } from "./create-study-mode-form";
import Link from "next/link";

export default async function StudyModesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true, mustChangePassword: true },
  });
  if (!actor || actor.role !== "ADMINISTRATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const modes = await listStudyModes({ includeInactive: true });

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/administrator/catalogue" className="text-sm text-gray-500 hover:underline">← Catalogue</Link>
        <h1 className="text-2xl font-semibold">Study Modes</h1>
      </div>
      <CreateStudyModeForm />
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {modes.map((m) => <StudyModeRow key={m.id} mode={m} />)}
        </tbody>
      </table>
    </main>
  );
}
