"use client";

import { useActionState } from "react";
import { updateSystemSettingsAction } from "@/lib/actions/system-settings-action";
import type { SystemSettings } from "@/lib/system-settings";
import { Banner } from "@/components/ui/banner";
import { CheckCircle } from "lucide-react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 9,
  border: "1px solid var(--line)",
  background: "var(--surface)",
  color: "var(--ink)",
  fontSize: 13.5,
  padding: "9px 12px",
  outline: "none",
  fontFamily: "inherit",
};

function Field({ id, label, defaultValue, step }: { id: string; label: string; defaultValue: number; step?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label htmlFor={id} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>{label}</label>
      <input id={id} name={id} type="number" step={step ?? "1"} required defaultValue={defaultValue} style={inputStyle} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", overflow: "hidden" }}>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--line-2)", background: "var(--surface-2)" }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</span>
      </div>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

export function SystemSettingsForm({ settings }: { settings: SystemSettings }) {
  const [state, action, pending] = useActionState(updateSystemSettingsAction, null);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 540 }}>
      {state?.error && <Banner variant="bad">{state.error}</Banner>}
      {state?.success && (
        <Banner variant="ok" icon={<CheckCircle size={14} />}>Settings saved.</Banner>
      )}

      <Section title="Academic">
        <Field id="defaultReminderPeriodDays" label="Default reminder period (days)" defaultValue={settings.defaultReminderPeriodDays} />
        <Field id="attendanceCorrectionWindowDays" label="Attendance correction window (days)" defaultValue={settings.attendanceCorrectionWindowDays} />
        <Field id="passThresholdPercent" label="Pass threshold (%)" defaultValue={settings.passThresholdPercent} step="0.1" />
        <Field id="attendanceRiskThresholdPercent" label="Attendance risk threshold (%)" defaultValue={settings.attendanceRiskThresholdPercent} step="0.1" />
        <Field id="postCourseMarkingWindowDays" label="Post-course marking window (days)" defaultValue={settings.postCourseMarkingWindowDays} />
      </Section>

      <Section title="Upload limits (bytes)">
        <Field id="maxUploadBytesChatAttachment" label="Chat attachment" defaultValue={settings.maxUploadBytesChatAttachment} />
        <Field id="maxUploadBytesSubmission" label="Submission" defaultValue={settings.maxUploadBytesSubmission} />
        <Field id="maxUploadBytesContentAttachment" label="Content attachment" defaultValue={settings.maxUploadBytesContentAttachment} />
        <Field id="maxUploadBytesAnnouncementAttachment" label="Announcement attachment" defaultValue={settings.maxUploadBytesAnnouncementAttachment} />
      </Section>

      <div>
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "9px 22px",
            borderRadius: 10,
            background: "var(--primary-strong)",
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 700,
            border: "none",
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
            boxShadow: "0 4px 12px -4px oklch(0.5 0.15 162 / 0.35)",
          }}
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
