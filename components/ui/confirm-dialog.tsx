"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  variant = "default",
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  // Close on backdrop click
  function handleClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const outside =
      e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top || e.clientY > rect.bottom;
    if (outside) onCancel();
  }

  return (
    <dialog
      ref={ref}
      onClick={handleClick}
      onClose={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        margin: "auto",
        height: "fit-content",
        borderRadius: 18,
        border: "none",
        padding: 0,
        boxShadow: "var(--shadow-lg)",
        background: "var(--surface-card)",
        color: "var(--ink)",
        width: 380,
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <div style={{ padding: "24px 24px 20px" }}>
        <p
          style={{
            margin: 0,
            fontWeight: 700,
            fontSize: 16,
            color: "var(--ink)",
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </p>
        {body && (
          <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "var(--ink-3)", lineHeight: 1.55 }}>
            {body}
          </p>
        )}
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          padding: "0 20px 20px",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "8px 18px",
            borderRadius: 10,
            background: "var(--surface-2)",
            color: "var(--ink-2)",
            fontSize: 13.5,
            fontWeight: 600,
            border: "1px solid var(--line)",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          style={{
            padding: "8px 18px",
            borderRadius: 10,
            background: variant === "danger" ? "var(--bad)" : "var(--primary-strong)",
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
