import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EditFacultyForm } from "./edit-faculty-form";
import Link from "next/link";

export default async function EditFacultyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const { id } = await params;
  const faculty = await prisma.faculty.findUnique({ where: { id } });
  if (!faculty) notFound();

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/catalogue/faculties" className="text-sm text-gray-500 hover:underline">
          ← Faculties
        </Link>
        <h1 className="text-2xl font-semibold">Edit Faculty</h1>
      </div>
      <EditFacultyForm id={faculty.id} defaultName={faculty.name} />
    </main>
  );
}
