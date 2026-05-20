import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { listModuleContent } from "@/lib/module-content";

export default async function StudentContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { account } = await requireAuthPage({ roles: ["STUDENT"] });

  const mo = await prisma.moduleOffering.findUnique({
    where: { id },
    include: { templateModule: { include: { module: true } } },
  });
  if (!mo) notFound();

  let sections;
  try {
    sections = await listModuleContent({ moduleOfferingId: id, viewerId: account.id });
  } catch {
    notFound();
  }

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Content — {mo.templateModule.module.name}</h1>
        <Link href={`/student/modules/${id}`} className="text-sm text-blue-600 underline">Back to module</Link>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-gray-500">No content published yet.</p>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.id}>
              <h2 className="font-semibold text-gray-700 mb-2">{section.title}</h2>
              {section.contentItems.length === 0 ? (
                <p className="text-sm text-gray-400">No published items in this section.</p>
              ) : (
                <ul className="space-y-2">
                  {section.contentItems.map((item) => (
                    <li key={item.id} className="rounded border border-gray-200 bg-white px-5 py-4">
                      <h3 className="font-medium text-gray-800">{item.title}</h3>
                      <div
                        className="mt-2 text-sm text-gray-600 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: item.body }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
