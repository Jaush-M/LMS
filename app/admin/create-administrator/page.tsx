import { requireAuthPage } from "@/lib/auth-guard";
import { CreateAdministratorForm } from "./form";

export default async function CreateAdministratorPage() {
  await requireAuthPage({ roles: ["SUPER_ADMINISTRATOR"] });

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Create Administrator</h1>
      <div className="mt-6 max-w-sm">
        <CreateAdministratorForm />
      </div>
    </main>
  );
}
