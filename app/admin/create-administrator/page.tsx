import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CreateAdministratorForm } from "./form";

export default async function CreateAdministratorPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const userAccount = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true },
  });

  if (!userAccount || userAccount.role !== "SUPER_ADMINISTRATOR") {
    redirect("/dashboard");
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Create Administrator</h1>
      <div className="mt-6 max-w-sm">
        <CreateAdministratorForm />
      </div>
    </main>
  );
}
