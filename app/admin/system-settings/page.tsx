import { requireAuthPage } from "@/lib/auth-guard";
import { getSystemSettings } from "@/lib/system-settings";
import { SystemSettingsForm } from "./form";

export default async function SystemSettingsPage() {
  await requireAuthPage({ roles: ["SUPER_ADMINISTRATOR"] });

  const settings = await getSystemSettings();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">System Settings</h1>
      <p className="mt-1 text-sm text-gray-600">
        Changes are logged to the Audit Log with before and after values.
      </p>
      <div className="mt-6">
        <SystemSettingsForm settings={settings} />
      </div>
    </main>
  );
}
