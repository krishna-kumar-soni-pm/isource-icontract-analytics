"use client";

import { cn } from "@/lib/utils";

export interface BarItem {
  label: string;
  value: number;
  /** optional secondary text shown under the label */
  sub?: string;
}

/**
 * Clean horizontal bar list — full labels (never truncated), a tinted bar
 * behind each row, and a right-aligned value. Replaces cramped Recharts axes
 * for "top N" rankings.
 */
export function BarList({
  data,
  color = "var(--chart-1)",
  valueFormatter = (n) => n.toLocaleString(),
  className,
}: {
  data: BarItem[];
  color?: string;
  valueFormatter?: (n: number) => string;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {data.map((d, i) => (
        <div key={i} className="group relative flex items-center gap-3 rounded-md px-2 py-1.5">
          {/* bar fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-md transition-all"
            style={{
              width: `${Math.max((d.value / max) * 100, 1.5)}%`,
              background: color,
              opacity: 0.16,
            }}
          />
          <div className="relative z-10 min-w-0 flex-1">
            <div className="text-sm leading-snug" title={d.label}>
              {d.label}
            </div>
            {d.sub && <div className="text-xs text-muted-foreground">{d.sub}</div>}
          </div>
          <div className="relative z-10 shrink-0 text-sm font-semibold tabular-nums">
            {valueFormatter(d.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
