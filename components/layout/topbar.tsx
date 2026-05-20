"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, HelpCircle, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { DarkModeToggle } from "@/components/ui/dark-mode-toggle";
import { authClient } from "@/lib/auth-client";
import type { UserRole } from "@/lib/generated/prisma/enums";

const PAGE_TITLES: Record<string, string> = {
  "/student/dashboard":             "Dashboard",
  "/student/modules":               "My Modules",
  "/student/academic-calendar":     "Calendar",
  "/student/notification-center":   "Notifications",
  "/educator/dashboard":            "Dashboard",
  "/educator/modules":              "My Modules",
  "/educator/academic-calendar":    "Schedule",
  "/educator/notification-center":  "Notifications",
  "/admin/dashboard":               "Overview",
  "/admin/course-offerings":        "Course Offerings",
  "/admin/catalogue":               "Academic Catalogue",
  "/admin/accounts":                "Accounts",
  "/admin/enrollment-import":       "Enrollment Import",
  "/admin/academic-calendar":       "Academic Calendar",
  "/admin/create-account":          "Create Account",
  "/admin/create-administrator":    "Create Administrator",
  "/admin/system-settings":         "System Settings",
};

function getTitle(pathname: string): string {
  for (const [prefix, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(prefix)) return title;
  }
  return "LMS Portal";
}

function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "STUDENT":           return "Student";
    case "EDUCATOR":          return "Educator";
    case "ADMINISTRATOR":     return "Administrator";
    case "SUPER_ADMINISTRATOR": return "Super Admin";
  }
}

function getInitials(name: string): string {
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

function getAvatarTone(role: UserRole) {
  switch (role) {
    case "STUDENT":           return "lav" as const;
    case "EDUCATOR":          return "mint" as const;
    case "ADMINISTRATOR":     return "peach" as const;
    case "SUPER_ADMINISTRATOR": return "lemon" as const;
  }
}

interface TopbarProps {
  userName: string;
  userRole: UserRole;
  userEmail?: string;
}

export function Topbar({ userName, userRole, userEmail }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const title = getTitle(pathname);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/sign-in");
  }

  return (
    <header className="topbar">
      <div
        className="font-bold text-[18px] tracking-[-0.02em] mr-auto"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </div>

      <button
        className="w-10 h-10 rounded-xl grid place-items-center border border-line bg-surface hover:bg-surface-2 relative text-ink-2 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
      </button>

      <button
        className="w-10 h-10 rounded-xl grid place-items-center border border-line bg-surface hover:bg-surface-2 text-ink-2 transition-colors"
        aria-label="Help"
      >
        <HelpCircle size={18} />
      </button>

      <DarkModeToggle />

      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2.5 py-1 pr-3 pl-1 bg-surface border border-line-3 rounded-full hover:bg-surface-2 transition-colors"
          title={userEmail}
          aria-expanded={open}
          aria-haspopup="true"
        >
          <Avatar
            initials={getInitials(userName)}
            tone={getAvatarTone(userRole)}
            size="md"
          />
          <div className="leading-tight text-[12.5px]">
            <span className="block font-bold text-[13px] text-ink whitespace-nowrap">
              {userName}
            </span>
            <span className="text-[11.5px]" style={{ color: "var(--ink-4)" }}>
              {getRoleLabel(userRole)}
            </span>
          </div>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-surface border border-line rounded-xl shadow-lg py-1.5 z-50">
            <div className="px-3.5 py-2 border-b border-line">
              <p className="text-[12px] font-semibold text-ink truncate">{userName}</p>
              {userEmail && (
                <p className="text-[11px] truncate" style={{ color: "var(--ink-4)" }}>{userEmail}</p>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] text-ink-2 hover:bg-surface-2 transition-colors"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
