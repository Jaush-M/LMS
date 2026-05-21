"use client";

import { useActionState, useRef, useState } from "react";
import { deleteContentSectionAction } from "@/lib/actions/module-content-action";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2 } from "lucide-react";

type Props = { sectionId: string; moduleOfferingId: string };

export function DeleteSectionForm({ sectionId, moduleOfferingId }: Props) {
  const [state, action, pending] = useActionState(deleteContentSectionAction, null);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={action} style={{ display: "inline" }}>
        <input type="hidden" name="id" value={sectionId} />
        <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
      </form>

      {state?.error && <p style={{ fontSize: 11, color: "var(--bad)" }}>{state.error}</p>}

      <button
        type="button"
        disabled={pending}
        title="Delete section"
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
        title="Delete section?"
        body="All content items in this section will also be permanently deleted."
        confirmLabel="Delete section"
        variant="danger"
        onConfirm={() => { setOpen(false); formRef.current?.requestSubmit(); }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
