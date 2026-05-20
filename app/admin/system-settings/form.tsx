"use client";

import { useActionState } from "react";
import { updateSystemSettingsAction } from "@/lib/actions/system-settings-action";
import type { SystemSettings } from "@/lib/system-settings";

export function SystemSettingsForm({ settings }: { settings: SystemSettings }) {
  const [state, action, pending] = useActionState(updateSystemSettingsAction, null);

  return (
    <form action={action} className="space-y-6 max-w-lg">
      {state?.error && (
        <div role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div role="status" className="rounded bg-green-50 p-3 text-sm text-green-700">
          Settings saved.
        </div>
      )}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Academic
        </legend>
        <Field
          id="defaultReminderPeriodDays"
          label="Default reminder period (days)"
          defaultValue={settings.defaultReminderPeriodDays}
        />
        <Field
          id="attendanceCorrectionWindowDays"
          label="Attendance correction window (days)"
          defaultValue={settings.attendanceCorrectionWindowDays}
        />
        <Field
          id="passThresholdPercent"
          label="Pass threshold (%)"
          defaultValue={settings.passThresholdPercent}
          step="0.1"
        />
        <Field
          id="attendanceRiskThresholdPercent"
          label="Attendance risk threshold (%)"
          defaultValue={settings.attendanceRiskThresholdPercent}
          step="0.1"
        />
        <Field
          id="postCourseMarkingWindowDays"
          label="Post-course marking window (days)"
          defaultValue={settings.postCourseMarkingWindowDays}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Upload limits (bytes)
        </legend>
        <Field
          id="maxUploadBytesChatAttachment"
          label="Chat attachment"
          defaultValue={settings.maxUploadBytesChatAttachment}
        />
        <Field
          id="maxUploadBytesSubmission"
          label="Submission"
          defaultValue={settings.maxUploadBytesSubmission}
        />
        <Field
          id="maxUploadBytesContentAttachment"
          label="Content attachment"
          defaultValue={settings.maxUploadBytesContentAttachment}
        />
        <Field
          id="maxUploadBytesAnnouncementAttachment"
          label="Announcement attachment"
          defaultValue={settings.maxUploadBytesAnnouncementAttachment}
        />
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  defaultValue,
  step,
}: {
  id: string;
  label: string;
  defaultValue: number;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="number"
        step={step ?? "1"}
        required
        defaultValue={defaultValue}
        className="w-full rounded border px-3 py-2 text-sm"
      />
    </div>
  );
}
