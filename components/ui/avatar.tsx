import { cn } from "@/lib/utils";

type AvatarTone =
  | "lav"
  | "peach"
  | "sky"
  | "rose"
  | "lemon"
  | "sand"
  | "mint"
  | "";

type AvatarSize = "sm" | "md" | "lg" | "xl";

const TONE_STYLES: Record<string, string> = {
  lav:   "bg-lav text-lav-ink",
  peach: "bg-peach text-peach-ink",
  sky:   "bg-sky text-sky-ink",
  rose:  "bg-rose text-rose-ink",
  lemon: "bg-lemon text-lemon-ink",
  sand:  "bg-sand text-sand-ink",
  mint:  "bg-primary-soft text-primary-deep",
  "":    "bg-primary-soft text-primary-deep",
};

const SIZE_STYLES: Record<AvatarSize, string> = {
  sm: "w-[26px] h-[26px] text-[10.5px]",
  md: "w-8 h-8 text-[11.5px]",
  lg: "w-11 h-11 text-sm",
  xl: "w-16 h-16 text-xl",
};

interface AvatarProps {
  initials: string;
  tone?: AvatarTone;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ initials, tone = "", size = "md", className }: AvatarProps) {
  return (
    <div
      className={cn(
        "inline-grid place-items-center rounded-full font-bold flex-shrink-0",
        "font-display",
        TONE_STYLES[tone] ?? TONE_STYLES[""],
        SIZE_STYLES[size],
        className
      )}
      aria-label={`Avatar for ${initials}`}
    >
      {initials}
    </div>
  );
}
