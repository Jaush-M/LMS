import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function CataloguePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const actor = await prisma.userAccount.findUnique({
    where: { userId: session.user.id },
    select: { role: true, mustChangePassword: true },
  });
  if (!actor || actor.role !== "ADMINISTRATOR" && actor.role !== "SUPER_ADMINISTRATOR") redirect("/dashboard");
  if (actor.mustChangePassword) redirect("/change-password");

  const sections = [
    { href: "/admin/catalogue/faculties", label: "Faculties" },
    { href: "/admin/catalogue/courses", label: "Courses" },
    { href: "/admin/catalogue/modules", label: "Modules" },
    { href: "/admin/catalogue/intakes", label: "Intakes" },
    { href: "/admin/catalogue/study-modes", label: "Study Modes" },
    { href: "/admin/catalogue/session-types", label: "Session Types" },
  ];

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Academic Catalogue</h1>
      <ul className="mt-6 space-y-2">
        {sections.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="text-blue-600 underline">
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
