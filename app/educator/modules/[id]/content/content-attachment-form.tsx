"use client";

import { useActionState, useRef, useState } from "react";
import {
  addContentAttachmentAction,
  deleteContentAttachmentAction,
} from "@/lib/actions/module-content-action";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Paperclip, Trash2, ExternalLink } from "lucide-react";

type Attachment = {
  id: string;
  fileAsset: { originalFilename: string; storageKey: string; mimeType: string };
};

type Props = {
  contentItemId: string;
  moduleOfferingId: string;
  attachments: Attachment[];
};

const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"]);

function AttachmentDeleteButton({ attachmentId, moduleOfferingId, filename }: { attachmentId: string; moduleOfferingId: string; filename: string }) {
  const [, action, pending] = useActionState(deleteContentAttachmentAction, null);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={action} style={{ display: "inline" }}>
        <input type="hidden" name="attachmentId" value={attachmentId} />
        <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
      </form>

      <button
        type="button"
        disabled={pending}
        title="Remove file"
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center",
          background: "none", border: "none",
          cursor: pending ? "default" : "pointer",
          padding: 2, color: "var(--ink-4)", opacity: pending ? 0.4 : 1,
        }}
      >
        <Trash2 size={11} />
      </button>

      <ConfirmDialog
        open={open}
        title="Remove attachment?"
        body={`"${filename}" will be permanently deleted.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => { setOpen(false); formRef.current?.requestSubmit(); }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

export function ContentAttachmentForm({ contentItemId, moduleOfferingId, attachments }: Props) {
  const [state, action, pending] = useActionState(addContentAttachmentAction, null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {attachments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {attachments.map((att) => {
            const isImage = IMAGE_MIMES.has(att.fileAsset.mimeType);
            const fileUrl = `/api/files/${encodeURIComponent(att.fileAsset.storageKey)}?preview=1`;
            return (
              <div key={att.id}>
                {isImage && (
                  <div style={{ marginBottom: 4 }}>
                    <img
                      src={fileUrl}
                      alt={att.fileAsset.originalFilename}
                      style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, display: "block", objectFit: "contain" }}
                    />
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink-2)", textDecoration: "none" }}
                  >
                    <ExternalLink size={11} />
                    <span style={{ fontFamily: "monospace" }}>{att.fileAsset.originalFilename}</span>
                  </a>
                  <AttachmentDeleteButton
                    attachmentId={att.id}
                    moduleOfferingId={moduleOfferingId}
                    filename={att.fileAsset.originalFilename}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form action={action} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <input type="hidden" name="contentItemId" value={contentItemId} />
        <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
        {state?.error && <p style={{ fontSize: 11, color: "var(--bad)", width: "100%" }}>{state.error}</p>}
        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--ink-3)", cursor: "pointer" }}>
          <Paperclip size={12} />
          <input type="file" name="file" required disabled={pending} style={{ fontSize: 12, color: "var(--ink-2)" }} />
        </label>
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "4px 10px", borderRadius: 7,
            background: "var(--surface-2)", color: "var(--ink-2)",
            fontSize: 12, fontWeight: 600, border: "1px solid var(--line)",
            cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Uploading…" : "Attach"}
        </button>
      </form>
    </div>
  );
}
