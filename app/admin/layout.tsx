import { requireAuthPage } from "@/lib/auth-guard";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, account } = await requireAuthPage({ minRole: "ADMINISTRATOR" });

  return (
    <AppShell role={account.role} userName={user.name} userRole={account.role} userEmail={user.email}>
      {children}
    </AppShell>
  );
}
