"use client";

interface DonutProps {
  size?: number;
  stroke?: number;
  pct?: number;
  color?: string;
  track?: string;
  label?: string;
  sub?: string;
}

export function Donut({
  size = 92,
  stroke = 10,
  pct = 0,
  color = "var(--primary-strong)",
  track = "var(--surface-3)",
  label,
  sub,
}: DonutProps) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  const off = C * (1 - clamped);

  return (
    <div
      className="relative inline-block flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={off}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-tight">
        <div>
          {label && (
            <div
              className="font-bold tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: size > 70 ? 18 : 14,
                letterSpacing: "-0.03em",
                color: "var(--ink)",
              }}
            >
              {label}
            </div>
          )}
          {sub && (
            <div
              className="font-semibold"
              style={{ fontSize: 10.5, color: "var(--ink-4)" }}
            >
              {sub}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
