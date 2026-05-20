import { requireAuthPage } from "@/lib/auth-guard";
import { listSessionTypes } from "@/lib/catalogue";
import { SessionTypeRow } from "./session-type-row";
import { CreateSessionTypeForm } from "./create-session-type-form";
import Link from "next/link";

export default async function SessionTypesPage() {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const types = await listSessionTypes({ includeInactive: true });

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/catalogue" className="text-sm text-gray-500 hover:underline">← Catalogue</Link>
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
