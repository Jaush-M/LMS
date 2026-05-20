import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ContentActionsForm } from "./content-actions-form";

export default async function EducatorContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { account } = await requireAuthPage({ roles: ["EDUCATOR"] });

  const mo = await prisma.moduleOffering.findUnique({
    where: { id, primaryEducatorId: account.id },
    include: { templateModule: { include: { module: true } } },
  });
  if (!mo) notFound();

  const sections = await prisma.contentSection.findMany({
    where: { moduleOfferingId: id },
    orderBy: { sortOrder: "asc" },
    include: {
      contentItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Content — {mo.templateModule.module.name}</h1>
        <Link href={`/educator/modules/${id}`} className="text-sm text-blue-600 underline">Back to module</Link>
      </div>

      {/* Add section form */}
      <ContentActionsForm moduleOfferingId={id} />

      {/* Sections */}
      {sections.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No content sections yet.</p>
      ) : (
        <div className="mt-6 space-y-5">
          {sections.map((section) => (
            <div key={section.id} className="rounded border border-gray-200 bg-white">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-medium text-gray-800">{section.title}</h2>
                <ContentActionsForm moduleOfferingId={id} sectionId={section.id} addItem />
              </div>
              {section.contentItems.length === 0 ? (
                <p className="px-5 py-3 text-sm text-gray-400">No content items yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {section.contentItems.map((item) => (
                    <li key={item.id} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.title}</p>
                        <span className={`text-xs font-medium ${item.status === "PUBLISHED" ? "text-green-600" : "text-gray-400"}`}>
                          {item.status}
                        </span>
                      </div>
                      <ContentActionsForm
                        moduleOfferingId={id}
                        contentItemId={item.id}
                        isPublished={item.status === "PUBLISHED"}
                        togglePublish
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
