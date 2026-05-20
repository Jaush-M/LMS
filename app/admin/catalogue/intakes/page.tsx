import { requireAuthPage } from "@/lib/auth-guard";
import { listIntakes } from "@/lib/catalogue";
import { IntakeRow } from "./intake-row";
import { CreateIntakeForm } from "./create-intake-form";
import Link from "next/link";

export default async function IntakesPage() {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const intakes = await listIntakes({ includeInactive: true });

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/catalogue" className="text-sm text-gray-500 hover:underline">← Catalogue</Link>
        <h1 className="text-2xl font-semibold">Intakes</h1>
      </div>
      <CreateIntakeForm />
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {intakes.map((i) => <IntakeRow key={i.id} intake={i} />)}
        </tbody>
      </table>
    </main>
  );
}
