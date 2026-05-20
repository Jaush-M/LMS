import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EditSessionTypeForm } from "./edit-session-type-form";
import Link from "next/link";

export default async function EditSessionTypePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const { id } = await params;
  const type = await prisma.sessionType.findUnique({ where: { id } });
  if (!type) notFound();

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/catalogue/session-types" className="text-sm text-gray-500 hover:underline">← Session Types</Link>
        <h1 className="text-2xl font-semibold">Edit Session Type</h1>
      </div>
      <EditSessionTypeForm id={type.id} defaultName={type.name} />
    </main>
  );
}
