import { requireAuthPage } from "@/lib/auth-guard";
import { CreateAccountForm } from "./form";

export default async function CreateAccountPage() {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Create Account</h1>
      <div className="mt-6 max-w-sm">
        <CreateAccountForm />
      </div>
    </main>
  );
}
