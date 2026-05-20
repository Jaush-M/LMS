import { requireAuthPage } from "@/lib/auth-guard";
import { listStudyModes } from "@/lib/catalogue";
import { StudyModeRow } from "./study-mode-row";
import { CreateStudyModeForm } from "./create-study-mode-form";
import Link from "next/link";

export default async function StudyModesPage() {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const modes = await listStudyModes({ includeInactive: true });

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/catalogue" className="text-sm text-gray-500 hover:underline">← Catalogue</Link>
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
