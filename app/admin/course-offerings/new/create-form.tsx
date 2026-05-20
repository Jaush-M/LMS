"use client";

import { useActionState, useState } from "react";
import { createCourseOfferingAction } from "@/lib/actions/course-offering-action";
import { Banner } from "@/components/ui/banner";

type Course = {
  id: string;
  code: string;
  name: string;
  curriculumTemplate: {
    id: string;
    templateModules: {
      id: string;
      sortOrder: number;
      module: { name: string };
    }[];
  } | null;
};

type Educator = { id: string; generatedIdentifier: string; name: string };
type Intake = { id: string; name: string };
type StudyMode = { id: string; name: string };

type Props = {
  courses: Course[];
  educators: Educator[];
  intakes: Intake[];
  studyModes: StudyMode[];
};

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

const labelStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: "var(--ink-2)",
};

export function CreateCourseOfferingForm({ courses, educators, intakes, studyModes }: Props) {
  const [state, action, pending] = useActionState(createCourseOfferingAction, null);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const template = selectedCourse?.curriculumTemplate ?? null;

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640 }}>
      {state?.error && <Banner variant="bad">{state.error}</Banner>}

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label htmlFor="name" style={labelStyle}>Name</label>
        <input id="name" name="name" type="text" required style={inputStyle} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label htmlFor="courseId" style={labelStyle}>Course</label>
          <select
            id="courseId"
            name="courseId"
            required
            style={inputStyle}
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
          >
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
            ))}
          </select>
        </div>
        {template && <input type="hidden" name="curriculumTemplateId" value={template.id} />}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label htmlFor="intakeId" style={labelStyle}>Intake</label>
          <select id="intakeId" name="intakeId" required style={inputStyle}>
            <option value="">Select intake</option>
            {intakes.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label htmlFor="studyModeId" style={labelStyle}>Study mode</label>
          <select id="studyModeId" name="studyModeId" required style={inputStyle}>
            <option value="">Select study mode</option>
            {studyModes.map((sm) => <option key={sm.id} value={sm.id}>{sm.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label htmlFor="capacity" style={labelStyle}>Capacity</label>
          <input id="capacity" name="capacity" type="number" min={1} defaultValue={24} required style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label htmlFor="startAt" style={labelStyle}>Start date</label>
          <input id="startAt" name="startAt" type="date" required style={inputStyle} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label htmlFor="finishAt" style={labelStyle}>Finish date</label>
          <input id="finishAt" name="finishAt" type="date" required style={inputStyle} />
        </div>
      </div>

      {template && template.templateModules.length > 0 && (
        <div style={{ borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface-2)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>Module Educator Assignments</p>
          {template.templateModules
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((tm) => (
              <div key={tm.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "center" }}>
                <input type="hidden" name="templateModuleId" value={tm.id} />
                <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{tm.module.name}</span>
                <select
                  id={`educator-${tm.id}`}
                  name="primaryEducatorId"
                  required
                  aria-label={`Educator for ${tm.module.name}`}
                  style={inputStyle}
                >
                  <option value="">Select educator</option>
                  {educators.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.generatedIdentifier})</option>
                  ))}
                </select>
              </div>
            ))}
        </div>
      )}

      {!selectedCourseId && (
        <p style={{ fontSize: 13, color: "var(--ink-3)", fontStyle: "italic" }}>Select a course to see module assignments.</p>
      )}

      {selectedCourse && !template && (
        <Banner variant="bad">This course has no Curriculum Template. Please create one first.</Banner>
      )}

      <div>
        <button
          type="submit"
          disabled={pending || !template}
          style={{ padding: "9px 22px", borderRadius: 10, background: "var(--primary-strong)", color: "#fff", fontSize: 13.5, fontWeight: 700, border: "none", cursor: (pending || !template) ? "default" : "pointer", opacity: (pending || !template) ? 0.5 : 1, boxShadow: "0 4px 12px -4px oklch(0.5 0.15 162 / 0.35)" }}
        >
          {pending ? "Creating…" : "Create Course Offering"}
        </button>
      </div>
    </form>
  );
}
