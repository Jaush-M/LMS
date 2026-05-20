"use client";

import { useActionState } from "react";
import {
  createContentSectionAction,
  createModuleContentAction,
  publishModuleContentAction,
  unpublishModuleContentAction,
} from "@/lib/actions/module-content-action";

type Props = {
  moduleOfferingId: string;
  sectionId?: string;
  contentItemId?: string;
  isPublished?: boolean;
  addItem?: boolean;
  togglePublish?: boolean;
};

export function ContentActionsForm({ moduleOfferingId, sectionId, contentItemId, isPublished, addItem, togglePublish }: Props) {
  const [sectionState, sectionAction, sectionPending] = useActionState(createContentSectionAction, null);
  const [itemState, itemAction, itemPending] = useActionState(createModuleContentAction, null);
  const [pubState, pubAction, pubPending] = useActionState(
    isPublished ? unpublishModuleContentAction : publishModuleContentAction,
    null
  );

  if (togglePublish && contentItemId) {
    return (
      <form action={pubAction}>
        <input type="hidden" name="id" value={contentItemId} />
        <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
        {pubState?.error && <p className="text-xs text-red-600 mb-1">{pubState.error}</p>}
        <button
          type="submit"
          disabled={pubPending}
          className={`rounded px-3 py-1 text-xs font-medium text-white disabled:opacity-50 ${
            isPublished ? "bg-gray-400 hover:bg-gray-500" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {pubPending ? "…" : isPublished ? "Unpublish" : "Publish"}
        </button>
      </form>
    );
  }

  if (addItem && sectionId) {
    return (
      <form action={itemAction} className="flex gap-2 items-center">
        <input type="hidden" name="contentSectionId" value={sectionId} />
        <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
        {itemState?.error && <p className="text-xs text-red-600">{itemState.error}</p>}
        <input
          name="title"
          placeholder="New item title"
          required
          className="rounded border px-2 py-1 text-xs w-44"
        />
        <input
          name="body"
          placeholder="Body (optional)"
          className="rounded border px-2 py-1 text-xs w-32"
        />
        <button
          type="submit"
          disabled={itemPending}
          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {itemPending ? "Adding…" : "+ Item"}
        </button>
      </form>
    );
  }

  return (
    <form action={sectionAction} className="flex gap-2 items-center">
      <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
      {sectionState?.error && <p className="text-xs text-red-600">{sectionState.error}</p>}
      <input
        name="title"
        placeholder="New section title"
        required
        className="rounded border px-3 py-1.5 text-sm w-56"
      />
      <button
        type="submit"
        disabled={sectionPending}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {sectionPending ? "Creating…" : "Add Section"}
      </button>
    </form>
  );
}
