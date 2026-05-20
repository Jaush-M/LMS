"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { User, Lock, ArrowRight, BookOpen, BarChart2, Bell, Zap } from "lucide-react";
import { DarkModeToggle } from "@/components/ui/dark-mode-toggle";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const DEMO_PASSWORD = "Password@123";

const DEMO_USERS = [
  { role: "Super Admin",   name: "Amara Singh",       email: "sa000001@lms.edu.mv", initials: "AS", bg: "var(--lemon)",        ink: "var(--lemon-ink)"   },
  { role: "Administrator", name: "Hassan Ahmed",       email: "a000001@lms.edu.mv",  initials: "HA", bg: "var(--peach)",        ink: "var(--peach-ink)"   },
  { role: "Educator",      name: "Dr. James Wilson",  email: "e000001@lms.edu.mv",  initials: "JW", bg: "var(--primary-soft)", ink: "var(--primary-deep)"},
  { role: "Student",       name: "Lucas Oliveira",    email: "s000001@lms.edu.mv",  initials: "LO", bg: "var(--lav)",          ink: "var(--lav-ink)"     },
];

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [pending, setPending]   = useState(false);
  const [demoActive, setDemoActive] = useState<string | null>(null);

  async function signIn(emailVal: string, passwordVal: string) {
    setError(null);
    setPending(true);
    const result = await authClient.signIn.email({ email: emailVal, password: passwordVal });
    if (result.error) {
      setError("Invalid credentials. Please try again.");
      setPending(false);
      setDemoActive(null);
      return;
    }
    router.push("/dashboard");
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await signIn(
      form.get("email") as string,
      form.get("password") as string,
    );
  }

  async function loginAs(user: typeof DEMO_USERS[number]) {
    setEmail(user.email);
    setDemoActive(user.email);
    await signIn(user.email, DEMO_PASSWORD);
  }

  const isLoading = pending || demoActive !== null;

  return (
    <div
      className="min-h-screen grid"
      style={{ gridTemplateColumns: "1.05fr 1fr", background: "var(--bg)" }}
    >
      {/* ── Left — sign-in form ─────────────────────────────────────────── */}
      <div
        className="flex flex-col px-14 py-12 min-h-screen"
        style={{ borderRight: "1px solid var(--line)" }}
      >
        {/* Brand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-[11px] grid place-items-center text-white font-extrabold text-base flex-shrink-0"
              style={{ background: "var(--primary-strong)", fontFamily: "var(--font-display)", boxShadow: "0 8px 16px -8px oklch(0.5 0.15 162 / 0.55)" }}
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
          <DarkModeToggle />
        </div>

        {/* Form body */}
        <div className="mt-14 max-w-[420px] w-full">
          <p className="text-[11px] uppercase tracking-[0.12em] font-bold mb-3.5" style={{ color: "var(--ink-4)" }}>
            Academic Portal
          </p>
          <h1
            className="text-[38px] font-extrabold leading-[1.05] tracking-[-0.035em] mb-2.5"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            Welcome back.
          </h1>
          <p className="text-[14.5px] leading-[1.55] max-w-[380px]" style={{ color: "var(--ink-3)" }}>
            Sign in with your institutional credentials to access your learning dashboard.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-center gap-2 px-3.5 py-3 rounded-xl text-sm font-medium"
              style={{ background: "var(--bad-soft)", color: "var(--bad)" }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-7">
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--ink-4)" }} />
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="Institutional email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border py-3 pr-3.5 pl-[42px] text-sm outline-none transition-shadow"
                style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 14 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary-strong)"; e.currentTarget.style.boxShadow = "0 0 0 4px var(--primary-softer)"; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = "var(--line)";           e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--ink-4)" }} />
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Password"
                className="w-full rounded-xl border py-3 pr-3.5 pl-[42px] text-sm outline-none transition-shadow"
                style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 14 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary-strong)"; e.currentTarget.style.boxShadow = "0 0 0 4px var(--primary-softer)"; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = "var(--line)";           e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            <div className="flex items-center justify-between text-[12.5px] mt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none" style={{ color: "var(--ink-3)" }}>
                <input type="checkbox" className="w-3.5 h-3.5" style={{ accentColor: "var(--primary-strong)" }} />
                Remember me
              </label>
              <a href="#" className="font-semibold hover:underline" style={{ color: "var(--primary-deep)" }}>
                Need help?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-colors disabled:opacity-60"
              style={{ background: "var(--primary-strong)", boxShadow: "0 8px 16px -8px oklch(0.5 0.15 162 / 0.45)", fontSize: 14 }}
            >
              {pending && !demoActive ? "Signing in…" : "Sign in"}
              {!(pending && !demoActive) && <ArrowRight size={16} />}
            </button>
          </form>

          {/* ── Demo accounts (only when NEXT_PUBLIC_DEMO_MODE=true) ─────── */}
          {DEMO_MODE && <>
            <div
              className="flex items-center gap-2.5 mt-[26px] mb-4 text-[11px] font-bold uppercase tracking-[0.08em] whitespace-nowrap"
              style={{ color: "var(--ink-4)" }}
            >
              <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
              <span className="flex items-center gap-1.5">
                <Zap size={11} />
                Demo accounts
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {DEMO_USERS.map((u) => {
                const isThisLoading = demoActive === u.email;
                return (
                  <button
                    key={u.email}
                    onClick={() => loginAs(u)}
                    disabled={isLoading}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all disabled:opacity-50"
                    style={{
                      border: "1px solid var(--line)",
                      background: isThisLoading ? "var(--surface-2)" : "var(--surface)",
                      cursor: isLoading ? "not-allowed" : "pointer",
                    }}
                    onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = "var(--surface-2)"; }}
                    onMouseLeave={(e) => { if (!isThisLoading) e.currentTarget.style.background = "var(--surface)"; }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg grid place-items-center text-[11px] font-bold flex-shrink-0"
                      style={{ background: u.bg, color: u.ink }}
                    >
                      {isThisLoading ? (
                        <span className="block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      ) : (
                        u.initials
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold truncate" style={{ color: "var(--ink)" }}>
                        {u.role}
                      </div>
                      <div className="text-[11px] truncate" style={{ color: "var(--ink-4)" }}>
                        {u.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-center mt-3" style={{ color: "var(--ink-4)" }}>
              All demo accounts use password{" "}
              <code
                className="px-1.5 py-px rounded-md font-mono text-[11px]"
                style={{ background: "var(--surface-3)", color: "var(--ink-3)" }}
              >
                {DEMO_PASSWORD}
              </code>
            </p>
          </>}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-6 flex items-center justify-between text-[11.5px]" style={{ color: "var(--ink-4)" }}>
          <span>© 2026 Villa College</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-ink" style={{ color: "var(--ink-3)" }}>Privacy</a>
            <a href="#" className="hover:text-ink" style={{ color: "var(--ink-3)" }}>Support</a>
          </div>
        </div>
      </div>

      {/* ── Right — illustrative panel ──────────────────────────────────── */}
      <div
        className="relative overflow-hidden flex flex-col justify-between p-14"
        style={{ background: "linear-gradient(140deg, oklch(0.92 0.07 162) 0%, oklch(0.88 0.08 200) 100%)" }}
      >
        <div
          className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.12em] font-bold"
          style={{ color: "oklch(0.32 0.06 162)" }}
        >
          <div className="w-6 h-6 rounded-lg grid place-items-center" style={{ background: "rgba(255,255,255,0.35)" }}>
            <BookOpen size={13} />
          </div>
          Guided Academic Experience
        </div>

        <div className="flex-1 relative my-6">
          <div
            className="absolute top-[10%] left-0 right-0"
            style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", borderRadius: 18, border: "1px solid rgba(255,255,255,0.6)", padding: "18px 20px", maxWidth: 340, boxShadow: "0 24px 48px -20px rgba(20, 50, 35, 0.18)" }}
          >
            <p className="text-[14.5px] leading-relaxed font-medium m-0" style={{ color: "oklch(0.22 0.04 160)" }}>
              "The guided dashboard keeps my attention items front and center — I never miss a deadline."
            </p>
            <div className="flex items-center gap-2.5 mt-3.5">
              <div className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold flex-shrink-0" style={{ background: "var(--lav)", color: "var(--lav-ink)" }}>
                AN
              </div>
              <div>
                <div className="text-[12.5px] font-bold" style={{ color: "var(--ink)" }}>Aisha Naseem</div>
                <div className="text-[11px]" style={{ color: "var(--ink-4)" }}>BSc Computer Science, Year 2</div>
              </div>
            </div>
          </div>

          <div
            className="absolute bottom-[25%] right-0 flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)", minWidth: 220 }}
          >
            <div className="w-10 h-10 rounded-[11px] grid place-items-center flex-shrink-0" style={{ background: "var(--primary-soft)", color: "var(--primary-deep)" }}>
              <BarChart2 size={18} />
            </div>
            <div>
              <div className="text-[13px] font-bold" style={{ color: "var(--ink)" }}>Attendance tracking</div>
              <div className="text-[11px] mt-px" style={{ color: "var(--ink-3)" }}>Real-time per-module view</div>
            </div>
          </div>

          <div
            className="absolute bottom-[5%] left-[10%] flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)", minWidth: 220 }}
          >
            <div className="w-10 h-10 rounded-[11px] grid place-items-center flex-shrink-0" style={{ background: "var(--lav)", color: "var(--lav-ink)" }}>
              <Bell size={18} />
            </div>
            <div>
              <div className="text-[13px] font-bold" style={{ color: "var(--ink)" }}>Smart notifications</div>
              <div className="text-[11px] mt-px" style={{ color: "var(--ink-3)" }}>Mentions, marks, deadlines</div>
            </div>
          </div>
        </div>

        <div className="text-[12px] font-medium" style={{ color: "oklch(0.32 0.06 162)" }}>
          Villa College · Learning Management System · Academic year 2025/26
        </div>
      </div>
    </div>
  );
}
