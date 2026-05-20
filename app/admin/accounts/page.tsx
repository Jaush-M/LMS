import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { AccountRow } from "./account-row";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";

export default async function AdministratorAccountsPage() {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

  const accounts = await prisma.userAccount.findMany({
    where: { role: { in: ["STUDENT", "EDUCATOR"] } },
    select: {
      id: true,
      generatedIdentifier: true,
      institutionalEmail: true,
      role: true,
      status: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1
            className="text-[22px] font-extrabold tracking-[-0.03em]"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            Account Management
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--ink-3)" }}>
            {accounts.length} account{accounts.length !== 1 ? "s" : ""} · students and educators
          </p>
        </div>
        <Link
          href="/admin/create-account"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 16px",
            borderRadius: 11,
            background: "var(--primary-strong)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 4px 12px -4px oklch(0.5 0.15 162 / 0.45)",
          }}
        >
          <UserPlus size={15} />
          Create account
        </Link>
      </div>

      <Card flush>
        {accounts.length === 0 ? (
          <div style={{ padding: 24 }}>
            <EmptyState title="No accounts" body="Create student and educator accounts to get started." />
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {["Identifier", "Institutional email", "Role", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 20px",
                        textAlign: "left",
                        fontWeight: 700,
                        fontSize: 11.5,
                        color: "var(--ink-4)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <AccountRow key={account.id} account={account} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
