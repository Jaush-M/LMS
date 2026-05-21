"use client";

import { useState } from "react";
import { Rail } from "./rail";
import { Topbar } from "./topbar";
import type { UserRole } from "@/lib/generated/prisma/enums";

interface AppShellProps {
  role: UserRole;
  userName: string;
  userRole: UserRole;
  userEmail?: string;
  children: React.ReactNode;
}

export function AppShell({ role, userName, userRole, userEmail, children }: AppShellProps) {
  const [railOpen, setRailOpen] = useState(false);

  return (
    <div className="app-shell">
      {railOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setRailOpen(false)}
        />
      )}
      <Rail role={role} isOpen={railOpen} onClose={() => setRailOpen(false)} />
      <div className="flex flex-col min-w-0">
        <Topbar
          userName={userName}
          userRole={userRole}
          userEmail={userEmail}
          onMenuToggle={() => setRailOpen((v) => !v)}
        />
        <main className="canvas">{children}</main>
      </div>
    </div>
  );
}
