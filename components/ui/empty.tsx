import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "p-8 rounded-[16px] border border-dashed border-line-2 text-center bg-surface-2 text-ink-3",
        className
      )}
    >
      <p className="font-bold text-ink mb-1" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </p>
      {body && <p className="text-sm">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
