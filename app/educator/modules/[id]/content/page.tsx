import { requireAuthPage } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, BookOpen } from "lucide-react";
import { ContentActionsForm } from "./content-actions-form";
import { DeleteSectionForm } from "./delete-section-form";
import { DeleteContentItemForm } from "./delete-content-item-form";
import { ContentAttachmentForm } from "./content-attachment-form";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty";

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
      contentItems: {
        orderBy: { sortOrder: "asc" },
        include: { attachments: { include: { fileAsset: true } } },
      },
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href={`/educator/modules/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", width: "fit-content" }} className="module-back-link">
        <ChevronLeft size={15} />
        {mo.templateModule.module.name}
      </Link>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
            Content
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>{mo.templateModule.module.name}</p>
        </div>
        <ContentActionsForm moduleOfferingId={id} />
      </div>

      {sections.length === 0 ? (
        <EmptyState title="No content yet" body="Add your first section using the form above." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sections.map((section) => (
            <div key={section.id} style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", overflow: "hidden" }}>
              {/* Section header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 18px", borderBottom: "1px solid var(--line-2)", background: "var(--surface-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <BookOpen size={14} style={{ color: "var(--primary-strong)", flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{section.title}</span>
                  <Chip variant="default" size="sm">{section.contentItems.length} item{section.contentItems.length !== 1 ? "s" : ""}</Chip>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ContentActionsForm moduleOfferingId={id} sectionId={section.id} addItem />
                  <DeleteSectionForm key={`del-sec-${section.id}`} sectionId={section.id} moduleOfferingId={id} />
                </div>
              </div>

              {section.contentItems.length === 0 ? (
                <div style={{ padding: "14px 18px" }}>
                  <p style={{ fontSize: 12.5, color: "var(--ink-4)", fontStyle: "italic" }}>No items in this section yet.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {section.contentItems.map((item) => (
                    <div key={item.id} style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-2)" }}>
                      {/* Item header row */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", flex: 1, minWidth: 0 }}>{item.title}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <Chip variant={item.status === "PUBLISHED" ? "ok" : "default"} size="sm">{item.status}</Chip>
                          <ContentActionsForm
                            moduleOfferingId={id}
                            contentItemId={item.id}
                            isPublished={item.status === "PUBLISHED"}
                            togglePublish
                          />
                          <DeleteContentItemForm
                            key={`del-item-${item.id}`}
                            contentItemId={item.id}
                            moduleOfferingId={id}
                          />
                        </div>
                      </div>

                      {/* Attachments + upload */}
                      <div style={{ marginTop: 10 }}>
                        <ContentAttachmentForm
                          key={`att-${item.id}`}
                          contentItemId={item.id}
                          moduleOfferingId={id}
                          attachments={item.attachments}
                        />
                      </div>
                    </div>
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
