import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
  tight?: boolean;
  air?: boolean;
}

export function Card({ children, className, flush, tight, air }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface-card border border-line rounded-[20px]",
        flush ? "p-0 overflow-hidden" : tight ? "p-4" : air ? "p-6" : "p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}

export function CardHeader({ children, className, padded }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        padded ? "px-5 pt-[18px] pb-0 mb-2" : "mb-[14px]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, count }: { children: React.ReactNode; count?: number | string }) {
  return (
    <div className="flex items-baseline gap-2">
      <h3 className="text-[15px] font-bold tracking-[-0.015em]" style={{ fontFamily: "var(--font-display)" }}>
        {children}
      </h3>
      {count != null && (
        <span
          className="text-xs text-ink-3 font-semibold bg-surface-2 px-2 py-0.5 rounded-full"
        >
          {count}
        </span>
      )}
    </div>
  );
}
