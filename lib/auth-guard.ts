import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { isAtLeast } from "./rbac";
import type { UserRole } from "./generated/prisma/enums";
import type { Session } from "./auth";

export type AuthContext = {
  user: Session["user"];
  account: {
    id: string;
    role: UserRole;
    mustChangePassword: boolean;
  };
};

type GuardOptions = {
  // Allow any of these exact roles (evaluated before minRole)
  roles?: UserRole[];
  // Allow this role and any role above it in the hierarchy
  minRole?: UserRole;
};

async function resolveAuthContext(): Promise<AuthContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const account = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { id: true, role: true, mustChangePassword: true },
  });
  if (!account) return null;

  return { user: session.user, account };
}

function meetsRequirements(role: UserRole, options: GuardOptions): boolean {
  if (options.roles && !options.roles.includes(role)) return false;
  if (options.minRole && !isAtLeast(role, options.minRole)) return false;
  return true;
}

/**
 * Use in Server Component pages.
 * Redirects to /sign-in if unauthenticated, /change-password if password reset required,
 * or /dashboard if the role requirement is not met.
 */
export async function requireAuthPage(options: GuardOptions = {}): Promise<AuthContext> {
  const ctx = await resolveAuthContext();
  if (!ctx) redirect("/sign-in");
  if (ctx.account.mustChangePassword) redirect("/change-password");
  if (!meetsRequirements(ctx.account.role, options)) redirect("/dashboard");
  return ctx;
}

/**
 * Use in Server Actions that redirect on auth failure (throws NEXT_REDIRECT internally).
 * Same semantics as requireAuthPage — safe to call from both pages and actions.
 */
export async function requireAuthRedirect(options: GuardOptions = {}): Promise<AuthContext> {
  return requireAuthPage(options);
}

/**
 * Use in Server Actions that throw on auth failure.
 * Does NOT check mustChangePassword — callers that care should handle it themselves.
 */
export async function requireAuthAction(options: GuardOptions = {}): Promise<AuthContext> {
  const ctx = await resolveAuthContext();
  if (!ctx) throw new Error("Unauthorized");
  if (!meetsRequirements(ctx.account.role, options)) throw new Error("Unauthorized");
  return ctx;
}

/**
 * Returns the auth context without any enforcement — use when you need the
 * context but will handle auth failures yourself (e.g. the /dashboard routing hub).
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  return resolveAuthContext();
}
