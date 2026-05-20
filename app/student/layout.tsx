import { requireAuthPage } from "@/lib/auth-guard";
import { Rail } from "@/components/layout/rail";
import { Topbar } from "@/components/layout/topbar";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, account } = await requireAuthPage({ roles: ["STUDENT"] });

  return (
    <div className="app-shell">
      <Rail role={account.role} />
      <div className="flex flex-col min-w-0">
        <Topbar userName={user.name} userRole={account.role} userEmail={user.email} />
        <main className="canvas">{children}</main>
      </div>
    </div>
  );
}
