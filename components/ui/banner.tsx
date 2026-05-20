import { cn } from "@/lib/utils";

type BannerVariant = "info" | "ok" | "warn" | "bad";

const VARIANT_STYLES: Record<BannerVariant, string> = {
  info: "bg-info-soft text-info",
  ok:   "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad:  "bg-bad-soft text-bad",
};

interface BannerProps {
  variant?: BannerVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Banner({ variant = "info", icon, children, className }: BannerProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-[14px] py-3 rounded-xl text-[12.5px] font-medium",
        VARIANT_STYLES[variant],
        className
      )}
      role="alert"
    >
      {icon && <span className="flex-shrink-0 mt-px">{icon}</span>}
      <div>{children}</div>
    </div>
  );
}
