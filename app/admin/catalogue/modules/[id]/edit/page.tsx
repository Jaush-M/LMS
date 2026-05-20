import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EditModuleForm } from "./edit-module-form";
import Link from "next/link";

export default async function EditModulePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const { id } = await params;
  const mod = await prisma.module.findUnique({ where: { id } });
  if (!mod) notFound();

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/catalogue/modules" className="text-sm text-gray-500 hover:underline">← Modules</Link>
        <h1 className="text-2xl font-semibold">Edit Module</h1>
      </div>
      <p className="text-sm text-gray-500">Code: <span className="font-mono font-medium">{mod.code}</span></p>
      <EditModuleForm id={mod.id} defaultName={mod.name} defaultDescription={mod.description} />
    </main>
  );
}
