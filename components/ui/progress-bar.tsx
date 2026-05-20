import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: "sm" | "md";
  color?: string;
  className?: string;
}

export function ProgressBar({ value, max = 100, size = "sm", color, className }: ProgressBarProps) {
  const pct = Math.round(Math.min(100, Math.max(0, (value / max) * 100)));
  return (
    <div
      className={cn(
        "rounded-full overflow-hidden bg-surface-3",
        size === "sm" ? "h-1.5" : "h-2.5",
        className
      )}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
    >
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{
          width: `${pct}%`,
          background: color ?? "var(--primary-strong)",
        }}
      />
    </div>
  );
}
