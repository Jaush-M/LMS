"use client";

import { useActionState, useState } from "react";
import { createCourseOfferingAction } from "@/lib/actions/course-offering-action";

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

export function CreateCourseOfferingForm({ courses, educators, intakes, studyModes }: Props) {
  const [state, action, pending] = useActionState(createCourseOfferingAction, null);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const template = selectedCourse?.curriculumTemplate ?? null;

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      {state?.error && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input id="name" name="name" type="text" required className="w-full rounded border px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="courseId" className="block text-sm font-medium">
            Course
          </label>
          <select
            id="courseId"
            name="courseId"
            required
            className="w-full rounded border px-3 py-2 text-sm"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
          >
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        {template && (
          <input type="hidden" name="curriculumTemplateId" value={template.id} />
        )}

        <div className="space-y-1">
          <label htmlFor="intakeId" className="block text-sm font-medium">
            Intake
          </label>
          <select id="intakeId" name="intakeId" required className="w-full rounded border px-3 py-2 text-sm">
            <option value="">Select intake</option>
            {intakes.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="studyModeId" className="block text-sm font-medium">
            Study mode
          </label>
          <select id="studyModeId" name="studyModeId" required className="w-full rounded border px-3 py-2 text-sm">
            <option value="">Select study mode</option>
            {studyModes.map((sm) => (
              <option key={sm.id} value={sm.id}>
                {sm.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="capacity" className="block text-sm font-medium">
            Capacity
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            defaultValue={24}
            required
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="startAt" className="block text-sm font-medium">
            Start date
          </label>
          <input id="startAt" name="startAt" type="date" required className="w-full rounded border px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label htmlFor="finishAt" className="block text-sm font-medium">
            Finish date
          </label>
          <input id="finishAt" name="finishAt" type="date" required className="w-full rounded border px-3 py-2 text-sm" />
        </div>
      </div>

      {template && template.templateModules.length > 0 && (
        <fieldset className="rounded border p-4 space-y-3">
          <legend className="px-1 text-sm font-medium">Module Offering Educator Assignments</legend>
          {template.templateModules
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((tm) => (
              <div key={tm.id} className="grid grid-cols-2 gap-4 items-center">
                <input type="hidden" name="templateModuleId" value={tm.id} />
                <span className="text-sm">{tm.module.name}</span>
                <div className="space-y-1">
                  <label htmlFor={`educator-${tm.id}`} className="sr-only">
                    Educator for {tm.module.name}
                  </label>
                  <select
                    id={`educator-${tm.id}`}
                    name="primaryEducatorId"
                    required
                    aria-label={`Educator for ${tm.module.name}`}
                    className="w-full rounded border px-3 py-2 text-sm"
                  >
                    <option value="">Select educator</option>
                    {educators.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.generatedIdentifier})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
        </fieldset>
      )}

      {!selectedCourseId && (
        <p className="text-sm text-gray-500">Select a course to see module assignments.</p>
      )}

      {selectedCourse && !template && (
        <p className="text-sm text-red-600">This course has no Curriculum Template. Please create one first.</p>
      )}

      <button
        type="submit"
        disabled={pending || !template}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create Course Offering"}
      </button>
    </form>
  );
}
