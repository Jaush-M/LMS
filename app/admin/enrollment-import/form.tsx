"use client";

import { useActionState } from "react";
import {
  commitEnrollmentCsvImportAction,
  previewEnrollmentCsvImportAction,
  type EnrollmentImportState,
} from "@/lib/actions/enrollment-import-action";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Banner } from "@/components/ui/banner";

type CourseOfferingOption = {
  id: string;
  label: string;
};

type EnrollmentImportFormProps = {
  courseOfferings: CourseOfferingOption[];
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid var(--line)",
  background: "var(--surface)",
  color: "var(--ink)",
  fontSize: 13.5,
  padding: "9px 12px",
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12.5,
  fontWeight: 600,
  color: "var(--ink-2)",
  marginBottom: 5,
};

const thStyle: React.CSSProperties = {
  padding: "9px 16px",
  textAlign: "left" as const,
  fontWeight: 700,
  fontSize: 11,
  color: "var(--ink-4)",
  letterSpacing: "0.05em",
  textTransform: "uppercase" as const,
  whiteSpace: "nowrap" as const,
};

const tdStyle: React.CSSProperties = {
  padding: "10px 16px",
  fontSize: 13,
  color: "var(--ink)",
  borderBottom: "1px solid var(--line-2)",
};

function StatusMessage({ state }: { state: EnrollmentImportState }) {
  if (!state?.error) return null;
  return <Banner variant="bad">{state.error}</Banner>;
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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Card>
        <form action={previewAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <StatusMessage state={previewState} />

          <div>
            <label htmlFor="courseOfferingId" style={labelStyle}>Course Offering</label>
            <select
              id="courseOfferingId"
              name="courseOfferingId"
              required
              defaultValue={preview?.courseOfferingId ?? ""}
              style={inputStyle}
            >
              <option value="">Select a Course Offering…</option>
              {courseOfferings.map((co) => (
                <option key={co.id} value={co.id}>{co.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="csvFile" style={labelStyle}>CSV file</label>
            <input
              id="csvFile"
              name="csvFile"
              type="file"
              accept=".csv,text/csv"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="csvText" style={labelStyle}>Or paste CSV text</label>
            <textarea
              id="csvText"
              name="csvText"
              rows={5}
              style={{ ...inputStyle, fontFamily: "monospace", resize: "vertical" }}
              defaultValue={preview?.csvText ?? ""}
            />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-2)", cursor: "pointer" }}>
            <input
              type="checkbox"
              name="createMissingAccounts"
              defaultChecked={preview?.createMissingAccounts ?? false}
              style={{ accentColor: "var(--primary-strong)", width: 14, height: 14 }}
            />
            Create missing Student accounts automatically
          </label>

          <div>
            <button
              type="submit"
              disabled={previewPending}
              style={{
                padding: "9px 20px",
                borderRadius: 10,
                background: previewPending ? "var(--primary-deep)" : "var(--primary-strong)",
                color: "#fff",
                fontSize: 13.5,
                fontWeight: 700,
                border: "none",
                cursor: previewPending ? "default" : "pointer",
                opacity: previewPending ? 0.7 : 1,
              }}
            >
              {previewPending ? "Previewing…" : "Preview enrollment CSV"}
            </button>
          </div>
        </form>
      </Card>

      {preview && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Summary chips */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Chip variant="default">Rows: {preview.totalRows}</Chip>
            <Chip variant="ok">Valid: {preview.validRows.length}</Chip>
            {preview.invalidRows.length > 0 && (
              <Chip variant="bad">Invalid: {preview.invalidRows.length}</Chip>
            )}
          </div>

          {/* Valid rows */}
          {preview.validRows.length > 0 && (
            <Card flush>
              <div style={{ padding: "12px 16px 8px", fontWeight: 700, fontSize: 13, color: "var(--ink-2)" }}>
                Valid rows ({preview.validRows.length})
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--line)" }}>
                      {["Row", "Student Identifier", "Email", "Name", "Action"].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.validRows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td style={tdStyle}>{row.rowNumber}</td>
                        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{row.studentIdentifier ?? "—"}</td>
                        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{row.institutionalEmail ?? "—"}</td>
                        <td style={tdStyle}>{row.name || "—"}</td>
                        <td style={tdStyle}>
                          <Chip variant={row.action === "match_existing" ? "sky" : "lav"} size="sm">
                            {row.action === "match_existing" ? "Match existing" : "Create account"}
                          </Chip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Invalid rows */}
          {preview.invalidRows.length > 0 && (
            <Card flush>
              <div style={{ padding: "12px 16px 8px", fontWeight: 700, fontSize: 13, color: "var(--bad)" }}>
                Invalid rows ({preview.invalidRows.length})
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--line)" }}>
                      {["Row", "Student Identifier", "Email", "Errors"].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.invalidRows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td style={tdStyle}>{row.rowNumber}</td>
                        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{row.studentIdentifier ?? "—"}</td>
                        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{row.institutionalEmail ?? "—"}</td>
                        <td style={{ ...tdStyle, color: "var(--bad)" }}>{row.errors.join("; ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Commit form */}
          <form action={commitAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <StatusMessage state={commitState} />
            <input type="hidden" name="courseOfferingId" value={preview.courseOfferingId} />
            <input type="hidden" name="csvText" value={preview.csvText} />
            <input type="hidden" name="createMissingAccounts" value={String(preview.createMissingAccounts)} />
            <div>
              <button
                type="submit"
                disabled={commitPending || preview.validRows.length === 0}
                style={{
                  padding: "9px 20px",
                  borderRadius: 10,
                  background: "var(--ok)",
                  color: "#fff",
                  fontSize: 13.5,
                  fontWeight: 700,
                  border: "none",
                  cursor: (commitPending || preview.validRows.length === 0) ? "default" : "pointer",
                  opacity: (commitPending || preview.validRows.length === 0) ? 0.5 : 1,
                }}
              >
                {commitPending ? "Committing…" : `Commit ${preview.validRows.length} valid row${preview.validRows.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {result && (
        <Card>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <Chip variant="ok">Enrolled: {result.enrolledRows.length}</Chip>
            <Chip variant="default">Skipped: {result.skippedRows.length}</Chip>
            {result.createdAccounts.length > 0 && (
              <Chip variant="lav">Accounts created: {result.createdAccounts.length}</Chip>
            )}
          </div>

          {result.createdAccounts.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink-2)", marginBottom: 8 }}>New accounts</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    {["Row", "Name", "Identifier", "Email", "Temp Password"].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.createdAccounts.map((account) => (
                    <tr key={account.userAccountId}>
                      <td style={tdStyle}>{account.rowNumber}</td>
                      <td style={tdStyle}>{account.name}</td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{account.identifier}</td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{account.institutionalEmail}</td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12, color: "var(--primary-deep)", fontWeight: 700 }}>{account.temporaryPassword}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
