"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Book, Bell, Calendar, Settings, HelpCircle,
  Users, Shield, History, Layers, Activity, Eye,
  Lock, Flag, Network, CheckSquare, MessageSquare,
  ClipboardList, Award, LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/generated/prisma/enums";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  count?: number;
};

function getNavItems(role: UserRole): NavItem[] {
  if (role === "STUDENT") {
    return [
      { id: "dashboard",     label: "Dashboard",        href: "/student/dashboard",              icon: Home },
      { id: "modules",       label: "My Modules",       href: "/student/modules",                icon: Book },
      { id: "calendar",      label: "Calendar",         href: "/student/academic-calendar",      icon: Calendar },
      { id: "notifications", label: "Notifications",    href: "/student/notification-center",    icon: Bell },
    ];
  }

  if (role === "EDUCATOR") {
    return [
      { id: "dashboard",     label: "Dashboard",        href: "/educator/dashboard",             icon: Home },
      { id: "modules",       label: "My Modules",       href: "/educator/modules",               icon: Book },
      { id: "calendar",      label: "Schedule",         href: "/educator/academic-calendar",     icon: Calendar },
      { id: "notifications", label: "Notifications",    href: "/educator/notification-center",   icon: Bell },
    ];
  }

  if (role === "ADMINISTRATOR" || role === "SUPER_ADMINISTRATOR") {
    return [
      { id: "dashboard",       label: "Overview",          href: "/admin/dashboard",              icon: LayoutDashboard },
      { id: "offerings",       label: "Course Offerings",  href: "/admin/course-offerings",       icon: Layers },
      { id: "catalogue",       label: "Catalogue",         href: "/admin/catalogue",              icon: Book },
      { id: "accounts",        label: "Accounts",          href: "/admin/accounts",               icon: Users },
      { id: "enrollment",      label: "Enrollment",        href: "/admin/enrollment-import",      icon: Network },
      { id: "calendar",        label: "Academic Calendar", href: "/admin/academic-calendar",      icon: Calendar },
      ...(role === "SUPER_ADMINISTRATOR"
        ? [
            { id: "create-admin", label: "Create Admin",   href: "/admin/create-administrator",   icon: Shield },
            { id: "settings",     label: "System Settings",href: "/admin/system-settings",        icon: Settings },
          ]
        : []),
    ];
  }

  return [];
}

interface RailProps {
  role: UserRole;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Rail({ role, isOpen, onClose }: RailProps) {
  const pathname = usePathname();

  const navItems = getNavItems(role);

  return (
    <aside className={cn("rail", isOpen && "rail--open")}>
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2.5 pb-[22px]">
        <div
          className="w-9 h-9 rounded-[11px] grid place-items-center text-white font-extrabold text-base flex-shrink-0"
          style={{
            background: "var(--primary-strong)",
            fontFamily: "var(--font-display)",
            boxShadow: "0 8px 16px -8px oklch(0.5 0.15 162 / 0.55)",
          }}
        >
          V
        </div>
        <div style={{ fontFamily: "var(--font-display)" }}>
          <div className="font-extrabold text-[17px] tracking-[-0.025em] text-ink">
            LMS Portal
          </div>
          <div
            className="text-[10.5px] font-medium uppercase tracking-[0.08em] mt-px"
            style={{ color: "var(--ink-4)" }}
          >
            Academic year 25/26
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div
        className="text-[10.5px] uppercase tracking-[0.1em] font-bold px-3 py-1.5 mb-px"
        style={{ color: "var(--ink-4)" }}
      >
        Main
      </div>
      <nav className="flex flex-col gap-px" aria-label="Main navigation">
        {navItems.map((item) => {
          const Ico = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-[11px] px-3 py-[9px] rounded-[10px] text-[13.5px] font-medium transition-colors duration-100",
                isActive
                  ? "bg-primary-soft text-primary-deep font-bold"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Ico
                size={18}
                className={cn("flex-shrink-0", isActive ? "text-primary-deep" : "text-ink-3")}
              />
              <span className="flex-1">{item.label}</span>
              {item.count != null && (
                <span
                  className={cn(
                    "text-[11px] font-bold px-1.5 py-px rounded-full min-w-[22px] text-center",
                    isActive
                      ? "bg-white text-primary-deep"
                      : "bg-surface-3 text-ink-2"
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Workspace */}
      <div
        className="text-[10.5px] uppercase tracking-[0.1em] font-bold px-3 py-1.5 mt-3 mb-px"
        style={{ color: "var(--ink-4)" }}
      >
        Workspace
      </div>
      <nav className="flex flex-col gap-px">
        <Link
          href="#"
          className="flex items-center gap-[11px] px-3 py-[9px] rounded-[10px] text-[13.5px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors duration-100"
        >
          <HelpCircle size={18} className="text-ink-3 flex-shrink-0" />
          <span>Help & Policies</span>
        </Link>
        <Link
          href="#"
          className="flex items-center gap-[11px] px-3 py-[9px] rounded-[10px] text-[13.5px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors duration-100"
        >
          <Settings size={18} className="text-ink-3 flex-shrink-0" />
          <span>Settings</span>
        </Link>
      </nav>

    </aside>
  );
}
