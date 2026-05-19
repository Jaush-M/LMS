import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { EditIntakeForm } from "./edit-intake-form";
import Link from "next/link";

export default async function EditIntakePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true, mustChangePassword: true },
  });
  if (!actor || actor.role !== "ADMINISTRATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const { id } = await params;
  const intake = await prisma.intake.findUnique({ where: { id } });
  if (!intake) notFound();

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/administrator/catalogue/intakes" className="text-sm text-gray-500 hover:underline">← Intakes</Link>
        <h1 className="text-2xl font-semibold">Edit Intake</h1>
      </div>
      <EditIntakeForm id={intake.id} defaultName={intake.name} />
    </main>
  );
}
