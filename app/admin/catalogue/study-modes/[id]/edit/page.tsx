import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EditStudyModeForm } from "./edit-study-mode-form";
import Link from "next/link";

export default async function EditStudyModePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const { id } = await params;
  const mode = await prisma.studyMode.findUnique({ where: { id } });
  if (!mode) notFound();

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/catalogue/study-modes" className="text-sm text-gray-500 hover:underline">← Study Modes</Link>
        <h1 className="text-2xl font-semibold">Edit Study Mode</h1>
      </div>
      <EditStudyModeForm id={mode.id} defaultName={mode.name} />
    </main>
  );
}
