"use client";

import { useActionState, useRef, useState } from "react";
import { deleteSubmissionAction } from "@/lib/actions/assignment-action";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2 } from "lucide-react";

type Props = { submissionId: string; moduleOfferingId: string };

export function DeleteSubmissionForm({ submissionId, moduleOfferingId }: Props) {
  const [state, action, pending] = useActionState(deleteSubmissionAction, null);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={action} style={{ display: "inline" }}>
        <input type="hidden" name="submissionId" value={submissionId} />
        <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
      </form>

      {state?.error && (
        <p style={{ fontSize: 12.5, color: "var(--bad)", marginBottom: 4 }}>{state.error}</p>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "4px 9px", borderRadius: 7,
          background: "none", color: "var(--bad)",
          fontSize: 12.5, fontWeight: 600,
          border: "1px solid color-mix(in srgb, var(--bad) 30%, transparent)",
          cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1,
        }}
      >
        <Trash2 size={11} />
        {pending ? "Deleting…" : "Delete"}
      </button>

      <ConfirmDialog
        open={open}
        title="Delete submission?"
        body="Your file will be removed. You may re-submit before the deadline."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { setOpen(false); formRef.current?.requestSubmit(); }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
