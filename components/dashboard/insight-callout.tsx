import { Sparkles, TrendingUp, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Insight, InsightTone } from "@/lib/insights";

const TONE: Record<InsightTone, { icon: typeof Info; accent: string; ring: string }> = {
  good: { icon: TrendingUp, accent: "text-success", ring: "border-success/20 bg-success/[0.05]" },
  warn: { icon: AlertTriangle, accent: "text-warning", ring: "border-warning/25 bg-warning/[0.06]" },
  risk: { icon: ShieldAlert, accent: "text-danger", ring: "border-danger/20 bg-danger/[0.05]" },
  info: { icon: Info, accent: "text-chart-1", ring: "border-primary/15 bg-primary/[0.04]" },
};

/** A single inline insight banner — used contextually within tabs. */
export function InsightCallout({ insight }: { insight: Insight }) {
  const t = TONE[insight.tone];
  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5", t.ring)}>
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-card">
        <Sparkles className="size-3 text-primary" />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <t.icon className={cn("size-3.5 shrink-0", t.accent)} />
          <span className="text-sm font-semibold leading-snug">{insight.title}</span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{insight.detail}</p>
      </div>
    </div>
  );
}

/** Render all insights tagged for a placement (0..n) stacked. */
export function InsightCallouts({ insights }: { insights: Insight[] }) {
  if (!insights.length) return null;
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {insights.map((i) => (
        <div key={i.id} className="flex-1">
          <InsightCallout insight={i} />
        </div>
      ))}
    </div>
  );
}
