"use client";

import { useActionState } from "react";
import { submitAssignmentAction } from "@/lib/actions/assignment-action";
import { Upload } from "lucide-react";

type Props = {
  assignmentId: string;
  moduleOfferingId: string;
  isReplacement: boolean;
};

export function SubmitAssignmentForm({ assignmentId, moduleOfferingId, isReplacement }: Props) {
  const [state, action, pending] = useActionState(submitAssignmentAction, null);

  return (
    <form action={action} style={{ marginTop: 12 }}>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
      {state?.error && (
        <p style={{ fontSize: 12.5, color: "var(--bad)", marginBottom: 8 }}>{state.error}</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          type="file"
          name="file"
          required
          disabled={pending}
          style={{ fontSize: 13, color: "var(--ink-2)" }}
        />
        <div>
          <button
            type="submit"
            disabled={pending}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 10,
              background: "var(--primary-strong)", color: "#fff",
              fontSize: 13, fontWeight: 700, border: "none",
              cursor: pending ? "default" : "pointer",
              opacity: pending ? 0.6 : 1,
            }}
          >
            <Upload size={13} />
            {pending ? "Uploading…" : isReplacement ? "Replace Submission" : "Submit"}
          </button>
        </div>
      </div>
    </form>
  );
}
