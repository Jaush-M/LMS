import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EditIntakeForm } from "./edit-intake-form";
import Link from "next/link";

export default async function EditIntakePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const { id } = await params;
  const intake = await prisma.intake.findUnique({ where: { id } });
  if (!intake) notFound();

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/catalogue/intakes" className="text-sm text-gray-500 hover:underline">← Intakes</Link>
        <h1 className="text-2xl font-semibold">Edit Intake</h1>
      </div>
      <EditIntakeForm id={intake.id} defaultName={intake.name} />
    </main>
  );
}
