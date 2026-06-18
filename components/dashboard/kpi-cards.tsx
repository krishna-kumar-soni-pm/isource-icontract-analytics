import {
  Building2,
  MousePointerClick,
  Users,
  Layers,
  Gauge,
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { compact, fmt, pct } from "@/lib/format";
import type { Kpis } from "@/lib/analytics";

interface Item {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: string;
}

export function KpiCards({ kpis }: { kpis: Kpis }) {
  const items: Item[] = [
    {
      label: "Customers",
      value: fmt(kpis.companies),
      sub: `${kpis.activeLast30d} active in last 30 days`,
      icon: Building2,
    },
    {
      label: "Total interactions",
      value: compact(kpis.occurrences),
      sub: `${fmt(kpis.occurrences)} events & views`,
      icon: MousePointerClick,
      tone: "text-icontract",
    },
    {
      label: "Active users",
      value: compact(kpis.activeUsers),
      sub: "Peak unique users across features",
      icon: Users,
      tone: "text-isource",
    },
    {
      label: "Tracked features",
      value: fmt(kpis.features),
      sub: "Distinct events & pages",
      icon: Layers,
    },
    {
      label: "Avg. adoption",
      value: pct(kpis.adoptionRate, 1),
      sub: "Share of feature slots used",
      icon: Gauge,
      tone: "text-chart-3",
    },
    {
      label: "Active last 30d",
      value: fmt(kpis.activeLast30d),
      sub: `of ${kpis.companies} customers`,
      icon: Activity,
      tone: "text-success",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((it) => (
        <Card key={it.label} className="gap-0 py-0 shadow-xs">
          <CardContent className="flex flex-col gap-1.5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{it.label}</span>
              <it.icon className={cn("size-4 text-muted-foreground", it.tone)} />
            </div>
            <span className="text-2xl font-semibold tracking-tight tabular-nums">{it.value}</span>
            <span className="text-xs text-muted-foreground">{it.sub}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
