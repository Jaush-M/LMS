import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-guard";
import { ChangePasswordForm } from "./form";
import { Lock } from "lucide-react";

export default async function ChangePasswordPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.account.mustChangePassword) redirect("/dashboard");

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
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
          <span
            className="font-extrabold text-[17px] tracking-[-0.025em]"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            Villa LMS
          </span>
        </div>

        <div
          className="rounded-[20px] border p-8"
          style={{ background: "var(--surface)", borderColor: "var(--line)" }}
        >
          {/* Icon */}
          <div
            className="w-12 h-12 rounded-[14px] grid place-items-center mb-5"
            style={{ background: "var(--primary-soft)", color: "var(--primary-deep)" }}
          >
            <Lock size={22} />
          </div>

          <h1
            className="text-[24px] font-extrabold tracking-[-0.03em] mb-1.5"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            Set your password
          </h1>
          <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: "var(--ink-3)" }}>
            You must set a new password before you can access your account. Choose something secure and memorable.
          </p>

          <ChangePasswordForm />
        </div>

        <p className="text-center text-xs mt-5" style={{ color: "var(--ink-4)" }}>
          Villa College · Learning Management System
        </p>
      </div>
    </div>
  );
}
