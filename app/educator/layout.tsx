import { requireAuthPage } from "@/lib/auth-guard";
import { AppShell } from "@/components/layout/app-shell";

export default async function EducatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, account } = await requireAuthPage({ roles: ["EDUCATOR"] });

  return (
    <AppShell role={account.role} userName={user.name} userRole={account.role} userEmail={user.email}>
      {children}
    </AppShell>
  );
}
