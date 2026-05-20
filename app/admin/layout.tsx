import { requireAuthPage } from "@/lib/auth-guard";
import { Rail } from "@/components/layout/rail";
import { Topbar } from "@/components/layout/topbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, account } = await requireAuthPage({ minRole: "ADMINISTRATOR" });

  return (
    <div className="app-shell">
      <Rail role={account.role} userName={user.name} userInitials={user.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()} />
      <div className="flex flex-col min-w-0">
        <Topbar userName={user.name} userRole={account.role} userEmail={user.email} />
        <main className="canvas">{children}</main>
      </div>
    </div>
  );
}
