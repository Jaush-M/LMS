import { requireAuthPage } from "@/lib/auth-guard";
import Link from "next/link";

export default async function CataloguePage() {
  await requireAuthPage({ minRole: "ADMINISTRATOR" });

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
