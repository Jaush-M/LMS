"use client";

import { useActionState } from "react";
import {
  commitEnrollmentCsvImportAction,
  previewEnrollmentCsvImportAction,
  type EnrollmentImportState,
} from "@/lib/actions/enrollment-import-action";

type CourseOfferingOption = {
  id: string;
  label: string;
};

type EnrollmentImportFormProps = {
  courseOfferings: CourseOfferingOption[];
};

function StatusMessage({ state }: { state: EnrollmentImportState }) {
  if (!state?.error) return null;
  return (
    <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {state.error}
    </div>
  );
}

export function EnrollmentImportForm({ courseOfferings }: EnrollmentImportFormProps) {
  const [previewState, previewAction, previewPending] = useActionState(
    previewEnrollmentCsvImportAction,
    null
  );
  const [commitState, commitAction, commitPending] = useActionState(
    commitEnrollmentCsvImportAction,
    null
  );
  const preview = previewState?.preview;
  const result = commitState?.result;

  return (
    <div className="space-y-8">
      <form action={previewAction} className="max-w-2xl space-y-4 rounded border p-4">
        <StatusMessage state={previewState} />
        <div className="space-y-1">
          <label htmlFor="courseOfferingId" className="block text-sm font-medium">
            Course Offering
          </label>
          <select
            id="courseOfferingId"
            name="courseOfferingId"
            required
            className="w-full rounded border px-3 py-2 text-sm"
            defaultValue={preview?.courseOfferingId ?? ""}
          >
            <option value="">Select a Course Offering</option>
            {courseOfferings.map((courseOffering) => (
              <option key={courseOffering.id} value={courseOffering.id}>
                {courseOffering.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="csvFile" className="block text-sm font-medium">
            CSV file
          </label>
          <input
            id="csvFile"
            name="csvFile"
            type="file"
            accept=".csv,text/csv"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="csvText" className="block text-sm font-medium">
            CSV text
          </label>
          <textarea
            id="csvText"
            name="csvText"
            rows={6}
            className="w-full rounded border px-3 py-2 font-mono text-sm"
            defaultValue={preview?.csvText ?? ""}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="createMissingAccounts"
            defaultChecked={preview?.createMissingAccounts ?? false}
            className="h-4 w-4 rounded border"
          />
          Create missing Student accounts
        </label>
        <button
          type="submit"
          disabled={previewPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {previewPending ? "Previewing..." : "Preview enrollment CSV"}
        </button>
      </form>

      {preview && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded border px-3 py-1">Rows: {preview.totalRows}</span>
            <span className="rounded border px-3 py-1">Valid: {preview.validRows.length}</span>
            <span className="rounded border px-3 py-1">Invalid: {preview.invalidRows.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4 font-medium">Row</th>
                  <th className="py-2 pr-4 font-medium">Student Identifier</th>
                  <th className="py-2 pr-4 font-medium">Institutional Email</th>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {preview.validRows.map((row) => (
                  <tr key={row.rowNumber} className="border-b">
                    <td className="py-2 pr-4">{row.rowNumber}</td>
                    <td className="py-2 pr-4 font-mono">{row.studentIdentifier ?? "-"}</td>
                    <td className="py-2 pr-4 font-mono">{row.institutionalEmail ?? "-"}</td>
                    <td className="py-2 pr-4">{row.name || "-"}</td>
                    <td className="py-2 pr-4">
                      {row.action === "match_existing" ? "Match existing" : "Create account"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.invalidRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4 font-medium">Row</th>
                    <th className="py-2 pr-4 font-medium">Student Identifier</th>
                    <th className="py-2 pr-4 font-medium">Institutional Email</th>
                    <th className="py-2 pr-4 font-medium">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.invalidRows.map((row) => (
                    <tr key={row.rowNumber} className="border-b">
                      <td className="py-2 pr-4">{row.rowNumber}</td>
                      <td className="py-2 pr-4 font-mono">{row.studentIdentifier ?? "-"}</td>
                      <td className="py-2 pr-4 font-mono">{row.institutionalEmail ?? "-"}</td>
                      <td className="py-2 pr-4 text-red-700">{row.errors.join("; ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form action={commitAction} className="space-y-3">
            <StatusMessage state={commitState} />
            <input type="hidden" name="courseOfferingId" value={preview.courseOfferingId} />
            <input type="hidden" name="csvText" value={preview.csvText} />
            <input type="hidden" name="createMissingAccounts" value={String(preview.createMissingAccounts)} />
            <button
              type="submit"
              disabled={commitPending || preview.validRows.length === 0}
              className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              {commitPending ? "Committing..." : "Commit valid enrollment rows"}
            </button>
          </form>
        </section>
      )}

      {result && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded border px-3 py-1">Enrolled: {result.enrolledRows.length}</span>
            <span className="rounded border px-3 py-1">Skipped: {result.skippedRows.length}</span>
            <span className="rounded border px-3 py-1">Accounts created: {result.createdAccounts.length}</span>
          </div>

          {result.createdAccounts.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4 font-medium">Row</th>
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Identifier</th>
                    <th className="py-2 pr-4 font-medium">Institutional Email</th>
                    <th className="py-2 pr-4 font-medium">Temporary Password</th>
                  </tr>
                </thead>
                <tbody>
                  {result.createdAccounts.map((account) => (
                    <tr key={account.userAccountId} className="border-b">
                      <td className="py-2 pr-4">{account.rowNumber}</td>
                      <td className="py-2 pr-4">{account.name}</td>
                      <td className="py-2 pr-4 font-mono">{account.identifier}</td>
                      <td className="py-2 pr-4 font-mono">{account.institutionalEmail}</td>
                      <td className="py-2 pr-4 font-mono">{account.temporaryPassword}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
