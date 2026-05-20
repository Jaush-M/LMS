"use client";

import { useActionState, useRef, useEffect } from "react";
import { sendChatMessageAction } from "@/lib/actions/chat-action";

type Props = {
  chatId: string;
  moduleOfferingId: string;
  senderId: string;
};

export function ChatForm({ chatId, moduleOfferingId }: Props) {
  const [state, action, pending] = useActionState(sendChatMessageAction, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state?.error) ref.current?.reset();
  }, [pending, state]);

  return (
    <form ref={ref} action={action} className="flex gap-2">
      <input type="hidden" name="chatId" value={chatId} />
      <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
      {state?.error && <p className="text-sm text-red-600 mb-1">{state.error}</p>}
      <input
        name="body"
        placeholder="Type a message… use @identifier to mention"
        required
        className="flex-1 rounded border px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
