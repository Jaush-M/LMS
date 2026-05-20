"use client";

import { useActionState, useState } from "react";
import { publishAssignmentAction, unpublishAssignmentAction, extendDeadlineAction } from "@/lib/actions/assignment-action";
import { Calendar } from "lucide-react";

type Props = {
  moduleOfferingId: string;
  assignmentId: string;
  isPublished: boolean;
  currentDeadline: string;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 8,
  border: "1px solid var(--line)",
  background: "var(--surface)",
  color: "var(--ink)",
  fontSize: 13,
  padding: "7px 10px",
  outline: "none",
  fontFamily: "inherit",
};

export function AssignmentActionsForm({ moduleOfferingId, assignmentId, isPublished, currentDeadline }: Props) {
  const [showExtend, setShowExtend] = useState(false);
  const [pubState, pubAction, pubPending] = useActionState(
    isPublished ? unpublishAssignmentAction : publishAssignmentAction,
    null
  );
  const [extState, extAction, extPending] = useActionState(extendDeadlineAction, null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <form action={pubAction}>
          <input type="hidden" name="id" value={assignmentId} />
          <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
          {pubState?.error && <p style={{ fontSize: 12, color: "var(--bad)", marginBottom: 4 }}>{pubState.error}</p>}
          <button
            type="submit"
            disabled={pubPending}
            style={{
              padding: "7px 16px",
              borderRadius: 9,
              border: isPublished ? "1px solid var(--line)" : "none",
              background: isPublished ? "var(--surface-2)" : "var(--primary-strong)",
              color: isPublished ? "var(--ink-2)" : "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: pubPending ? "default" : "pointer",
              opacity: pubPending ? 0.6 : 1,
            }}
          >
            {pubPending ? "…" : isPublished ? "Unpublish" : "Publish"}
          </button>
        </form>

        <button
          onClick={() => setShowExtend(!showExtend)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 16px",
            borderRadius: 9,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--ink-2)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Calendar size={13} />
          Extend Deadline
        </button>
      </div>

      {showExtend && (
        <form action={extAction} style={{ borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface-2)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="hidden" name="assignmentId" value={assignmentId} />
          <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
          {extState?.error && <p style={{ fontSize: 12.5, color: "var(--bad)" }}>{extState.error}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>New Deadline</label>
              <input name="newDeadline" type="datetime-local" defaultValue={currentDeadline} required style={inputStyle} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>Reason</label>
              <input name="reason" required placeholder="Reason for extension" style={inputStyle} />
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={extPending}
              style={{
                padding: "7px 16px",
                borderRadius: 9,
                background: "var(--primary-strong)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                cursor: extPending ? "default" : "pointer",
                opacity: extPending ? 0.6 : 1,
              }}
            >
              {extPending ? "Extending…" : "Extend Deadline"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
