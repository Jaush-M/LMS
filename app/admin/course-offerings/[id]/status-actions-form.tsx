"use client";

import { useActionState } from "react";
import { activateCourseOfferingAction, cancelCourseOfferingAction, archiveCourseOfferingAction } from "@/lib/actions/course-offering-action";
import { Banner } from "@/components/ui/banner";

type Props = {
  courseOfferingId: string;
  status: string;
  isFinished: boolean;
};

const ghostBtn: React.CSSProperties = {
  padding: "7px 16px",
  borderRadius: 9,
  background: "var(--surface)",
  color: "var(--ink-2)",
  fontSize: 13,
  fontWeight: 700,
  border: "1px solid var(--line)",
};

export function StatusActionsForm({ courseOfferingId, status, isFinished }: Props) {
  const [activateState, activateAction, activatePending] = useActionState(activateCourseOfferingAction, null);
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelCourseOfferingAction, null);
  const [archiveState, archiveAction, archivePending] = useActionState(archiveCourseOfferingAction, null);

  if (status === "ARCHIVED" || status === "CANCELLED") return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {activateState?.error && <Banner variant="bad">{activateState.error}</Banner>}
      {cancelState?.error && <Banner variant="bad">{cancelState.error}</Banner>}
      {archiveState?.error && <Banner variant="bad">{archiveState.error}</Banner>}

      <div style={{ display: "flex", gap: 8 }}>
        {status === "PLANNED" && (
          <>
            <form action={activateAction}>
              <input type="hidden" name="courseOfferingId" value={courseOfferingId} />
              <button
                type="submit"
                disabled={activatePending}
                style={{
                  padding: "7px 16px",
                  borderRadius: 9,
                  background: "var(--primary-strong)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  border: "none",
                  cursor: activatePending ? "default" : "pointer",
                  opacity: activatePending ? 0.5 : 1,
                }}
              >
                {activatePending ? "Activating…" : "Activate"}
              </button>
            </form>

            <form action={cancelAction}>
              <input type="hidden" name="courseOfferingId" value={courseOfferingId} />
              <button
                type="submit"
                disabled={cancelPending}
                style={{ ...ghostBtn, cursor: cancelPending ? "default" : "pointer", opacity: cancelPending ? 0.5 : 1 }}
              >
                {cancelPending ? "Cancelling…" : "Cancel"}
              </button>
            </form>
          </>
        )}

        {status === "ACTIVE" && (
          <form action={archiveAction}>
            <input type="hidden" name="courseOfferingId" value={courseOfferingId} />
            <button
              type="submit"
              disabled={archivePending || !isFinished}
              title={!isFinished ? "Offering must be finished before archiving" : undefined}
              style={{ ...ghostBtn, cursor: (archivePending || !isFinished) ? "default" : "pointer", opacity: (archivePending || !isFinished) ? 0.5 : 1 }}
            >
              {archivePending ? "Archiving…" : "Archive"}
            </button>
          </form>
        )}
      </div>

      {status === "ACTIVE" && !isFinished && (
        <p style={{ fontSize: 12, color: "var(--ink-4)" }}>Archive becomes available after the finish date.</p>
      )}
    </div>
  );
}
