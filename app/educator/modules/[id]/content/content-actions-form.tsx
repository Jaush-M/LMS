"use client";

import { useActionState } from "react";
import {
  createContentSectionAction,
  createModuleContentAction,
  publishModuleContentAction,
  unpublishModuleContentAction,
} from "@/lib/actions/module-content-action";
import { Plus } from "lucide-react";

const inputStyle: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid var(--line)",
  background: "var(--surface)",
  color: "var(--ink)",
  fontSize: 12.5,
  padding: "6px 10px",
  outline: "none",
  fontFamily: "inherit",
};

type Props = {
  moduleOfferingId: string;
  sectionId?: string;
  contentItemId?: string;
  isPublished?: boolean;
  addItem?: boolean;
  togglePublish?: boolean;
};

export function ContentActionsForm({ moduleOfferingId, sectionId, contentItemId, isPublished, addItem, togglePublish }: Props) {
  const [sectionState, sectionAction, sectionPending] = useActionState(createContentSectionAction, null);
  const [itemState, itemAction, itemPending] = useActionState(createModuleContentAction, null);
  const [pubState, pubAction, pubPending] = useActionState(
    isPublished ? unpublishModuleContentAction : publishModuleContentAction,
    null
  );

  if (togglePublish && contentItemId) {
    return (
      <form action={pubAction}>
        <input type="hidden" name="id" value={contentItemId} />
        <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
        {pubState?.error && <p style={{ fontSize: 11, color: "var(--bad)", marginBottom: 4 }}>{pubState.error}</p>}
        <button
          type="submit"
          disabled={pubPending}
          style={{
            padding: "5px 12px",
            borderRadius: 7,
            border: isPublished ? "1px solid var(--line)" : "none",
            background: isPublished ? "var(--surface-2)" : "var(--primary-strong)",
            color: isPublished ? "var(--ink-3)" : "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: pubPending ? "default" : "pointer",
            opacity: pubPending ? 0.6 : 1,
          }}
        >
          {pubPending ? "…" : isPublished ? "Unpublish" : "Publish"}
        </button>
      </form>
    );
  }

  if (addItem && sectionId) {
    return (
      <form action={itemAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="hidden" name="contentSectionId" value={sectionId} />
        <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
        {itemState?.error && <p style={{ fontSize: 11, color: "var(--bad)" }}>{itemState.error}</p>}
        <input name="title" placeholder="Item title" required style={{ ...inputStyle, width: 160 }} />
        <input name="body" placeholder="Body (optional)" style={{ ...inputStyle, width: 120 }} />
        <button
          type="submit"
          disabled={itemPending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 12px",
            borderRadius: 8,
            background: "var(--primary-strong)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            border: "none",
            cursor: itemPending ? "default" : "pointer",
            opacity: itemPending ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          <Plus size={11} />
          {itemPending ? "Adding…" : "Add Item"}
        </button>
      </form>
    );
  }

  return (
    <form action={sectionAction} style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
      {sectionState?.error && <p style={{ fontSize: 12, color: "var(--bad)" }}>{sectionState.error}</p>}
      <input name="title" placeholder="New section title" required style={{ ...inputStyle, width: 200 }} />
      <button
        type="submit"
        disabled={sectionPending}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "7px 14px",
          borderRadius: 9,
          background: "var(--primary-strong)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          border: "none",
          cursor: sectionPending ? "default" : "pointer",
          opacity: sectionPending ? 0.6 : 1,
          boxShadow: "0 4px 12px -4px oklch(0.5 0.15 162 / 0.35)",
          flexShrink: 0,
        }}
      >
        <Plus size={13} />
        {sectionPending ? "Adding…" : "Add Section"}
      </button>
    </form>
  );
}
