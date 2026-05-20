import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listModuleContent } from "@/lib/module-content";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href={`/student/modules/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        {mo.templateModule.module.name}
      </Link>

      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          Content
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>{mo.templateModule.module.name}</p>
      </div>

      {sections.length === 0 ? (
        <EmptyState title="No content yet" body="Your educator hasn't published any content for this module." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {sections.map((section) => (
            <div key={section.id}>
              <div
                className="text-[11px] uppercase tracking-[0.1em] font-bold mb-3"
                style={{ color: "var(--ink-4)" }}
              >
                {section.title}
              </div>
              {section.contentItems.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--ink-4)" }}>No published items in this section.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {section.contentItems.map((item) => (
                    <Card key={item.id}>
                      <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--ink)" }}>{item.title}</div>
                      {item.body && (
                        <div
                          className="prose prose-sm max-w-none mt-3"
                          style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.65 }}
                          dangerouslySetInnerHTML={{ __html: item.body }}
                        />
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
