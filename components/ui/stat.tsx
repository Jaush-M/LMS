import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, delta, icon, children, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-surface-card border border-line rounded-[20px] p-[18px] px-5 flex gap-4 items-center min-h-[108px]",
        className
      )}
    >
      {icon && <div className="flex-shrink-0">{icon}</div>}
      {children}
      {!children && (
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] text-ink-3 font-medium">{label}</div>
          <div
            className="text-[28px] font-extrabold tracking-[-0.035em] leading-tight mt-1 tabular-nums"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {value}
          </div>
          {delta && <div className="text-[11.5px] font-bold mt-1.5 flex items-center gap-1">{delta}</div>}
        </div>
      )}
    </div>
  );
}

interface StatIconProps {
  children: React.ReactNode;
  tone?: "peach" | "lav" | "sky" | "rose" | "lemon" | "mint" | "sand";
}

export function StatIcon({ children, tone = "mint" }: StatIconProps) {
  const bg: Record<string, string> = {
    mint:  "bg-primary-soft text-primary-deep",
    peach: "bg-peach text-peach-ink",
    lav:   "bg-lav text-lav-ink",
    sky:   "bg-sky text-sky-ink",
    rose:  "bg-rose text-rose-ink",
    lemon: "bg-lemon text-lemon-ink",
    sand:  "bg-sand text-sand-ink",
  };
  return (
    <div
      className={cn(
        "w-14 h-14 rounded-[14px] grid place-items-center flex-shrink-0",
        bg[tone]
      )}
    >
      {children}
    </div>
  );
}
