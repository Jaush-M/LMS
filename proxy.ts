import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/super-administrator",
  "/administrator",
  "/educator",
  "/student",
  "/dashboard",
  "/change-password",
];

const SESSION_COOKIE = "better-auth.session_token";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected && !request.cookies.get(SESSION_COOKIE)?.value) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signIn);
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
