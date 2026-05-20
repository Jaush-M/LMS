import { requireAuthPage } from "@/lib/auth-guard";
import { Rail } from "@/components/layout/rail";
import { Topbar } from "@/components/layout/topbar";

export default async function EducatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, account } = await requireAuthPage({ roles: ["EDUCATOR"] });

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
