import { requireAuthPage } from "@/lib/auth-guard";
import { getSystemSettings } from "@/lib/system-settings";
import { SystemSettingsForm } from "./form";

export default async function SystemSettingsPage() {
  await requireAuthPage({ roles: ["SUPER_ADMINISTRATOR"] });

  const settings = await getSystemSettings();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          System Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
          Changes are logged to the Audit Log with before and after values.
        </p>
      </div>
      <SystemSettingsForm settings={settings} />
    </div>
  );
}
