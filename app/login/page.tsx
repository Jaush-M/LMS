import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            LMS
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">
            Sign in to your workspace
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            Use your generated institutional email and password.
          </p>
        </div>
        <LoginForm />
        <div className="mt-6 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          <p className="font-medium text-slate-700">Seed credentials</p>
          <p>Super Administrator: sa000001@lms.edu.mv</p>
          <p>Administrator: a000001@lms.edu.mv</p>
          <p>Educator: e000001@lms.edu.mv</p>
          <p>Student: s000001@lms.edu.mv</p>
          <p>Password: Password123!</p>
        </div>
      </section>
    </main>
  );
}
