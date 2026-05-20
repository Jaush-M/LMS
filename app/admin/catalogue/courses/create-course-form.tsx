"use client";

import { useActionState } from "react";
import { createCourseAction } from "@/lib/actions/catalogue-action";

type Faculty = { id: string; name: string };

export function CreateCourseForm({ faculties }: { faculties: Faculty[] }) {
  const [state, action, pending] = useActionState(createCourseAction, null);

  return (
    <form action={action} className="space-y-4 max-w-lg">
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="code" className="block text-sm font-medium">
            Course code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            required
            className="w-full rounded border px-3 py-2 text-sm font-mono"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="awardLevel" className="block text-sm font-medium">
            Award level
          </label>
          <select id="awardLevel" name="awardLevel" required className="w-full rounded border px-3 py-2 text-sm">
            <option value="">Select level</option>
            <option value="FOUNDATION">Foundation</option>
            <option value="DIPLOMA">Diploma</option>
            <option value="DEGREE">Degree</option>
            <option value="MASTERS">Masters</option>
            <option value="PHD">PhD</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input id="name" name="name" type="text" required className="w-full rounded border px-3 py-2 text-sm" />
      </div>
      <div className="space-y-1">
        <label htmlFor="facultyId" className="block text-sm font-medium">
          Faculty
        </label>
        <select id="facultyId" name="facultyId" required className="w-full rounded border px-3 py-2 text-sm">
          <option value="">Select faculty</option>
          {faculties.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="awardingBody" className="block text-sm font-medium">
          Awarding body <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <input
          id="awardingBody"
          name="awardingBody"
          type="text"
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add course"}
      </button>
    </form>
  );
}
