"use client";

import { useActionState, useRef, useEffect } from "react";
import { sendChatMessageAction } from "@/lib/actions/chat-action";
import { Send } from "lucide-react";

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
    <form ref={ref} action={action} style={{ display: "flex", gap: 8 }}>
      <input type="hidden" name="chatId" value={chatId} />
      <input type="hidden" name="moduleOfferingId" value={moduleOfferingId} />
      {state?.error && (
        <p style={{ fontSize: 12.5, color: "var(--bad)", marginBottom: 4 }}>{state.error}</p>
      )}
      <input
        name="body"
        placeholder="Type a message… use @identifier to mention"
        required
        style={{
          flex: 1,
          borderRadius: 10,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          color: "var(--ink)",
          fontSize: 13.5,
          padding: "9px 12px",
          outline: "none",
        }}
      />
      <button
        type="submit"
        disabled={pending}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "9px 16px",
          borderRadius: 10,
          background: "var(--primary-strong)",
          color: "#fff",
          fontSize: 13.5,
          fontWeight: 700,
          border: "none",
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.6 : 1,
          flexShrink: 0,
        }}
      >
        <Send size={14} />
        {pending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
