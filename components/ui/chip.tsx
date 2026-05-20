import { cn } from "@/lib/utils";

type ChipVariant =
  | "default"
  | "lav"
  | "peach"
  | "sky"
  | "rose"
  | "lemon"
  | "mint"
  | "sand"
  | "ok"
  | "warn"
  | "bad"
  | "info"
  | "ghost";

const VARIANT_STYLES: Record<ChipVariant, string> = {
  default: "bg-surface-2 text-ink-2",
  lav:     "bg-lav text-lav-ink",
  peach:   "bg-peach text-peach-ink",
  sky:     "bg-sky text-sky-ink",
  rose:    "bg-rose text-rose-ink",
  lemon:   "bg-lemon text-lemon-ink",
  mint:    "bg-primary-soft text-primary-deep",
  sand:    "bg-sand text-sand-ink",
  ok:      "bg-ok-soft text-ok",
  warn:    "bg-warn-soft text-warn",
  bad:     "bg-bad-soft text-bad",
  info:    "bg-info-soft text-info",
  ghost:   "bg-transparent border border-line-2 text-ink-2",
};

interface ChipProps {
  variant?: ChipVariant;
  dot?: boolean;
  size?: "sm" | "md";
  children: React.ReactNode;
  className?: string;
}

export function Chip({ variant = "default", dot = false, size = "md", children, className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[10.5px]" : "px-[9px] py-1 text-[11.5px]",
        VARIANT_STYLES[variant],
        className
      )}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0"
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
