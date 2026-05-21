"use client";

import { useActionState, useRef, useState } from "react";
import { deleteModuleContentAction } from "@/lib/actions/module-content-action";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2 } from "lucide-react";

type Props = { contentItemId: string; moduleOfferingId: string };

export function DeleteContentItemForm({ contentItemId, moduleOfferingId }: Props) {
  const [state, action, pending] = useActionState(deleteModuleContentAction, null);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={action} style={{ display: "inline" }}>
        <input type="hidden" name="id" value={contentItemId} />
        <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
      </form>

      {state?.error && <p style={{ fontSize: 11, color: "var(--bad)" }}>{state.error}</p>}

      <button
        type="button"
        disabled={pending}
        title="Delete item"
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, borderRadius: 7,
          background: "none", color: "var(--ink-4)",
          border: "1px solid var(--line)", cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.5 : 1,
        }}
      >
        <Trash2 size={12} />
      </button>

      <ConfirmDialog
        open={open}
        title="Delete content item?"
        body="This item and its attachments will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { setOpen(false); formRef.current?.requestSubmit(); }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
