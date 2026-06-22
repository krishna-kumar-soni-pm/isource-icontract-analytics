import { Sparkles, TrendingUp, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Insight, InsightTone } from "@/lib/insights";

const TONE: Record<InsightTone, { icon: typeof Info; dot: string; ring: string }> = {
  good: { icon: TrendingUp, dot: "text-success", ring: "border-success/20 bg-success/[0.04]" },
  warn: { icon: AlertTriangle, dot: "text-warning", ring: "border-warning/25 bg-warning/[0.05]" },
  risk: { icon: ShieldAlert, dot: "text-danger", ring: "border-danger/20 bg-danger/[0.04]" },
  info: { icon: Info, dot: "text-chart-1", ring: "border-border bg-muted/30" },
};

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <Card className="border-primary/15 bg-gradient-to-br from-primary/[0.03] to-transparent shadow-xs">
      <CardHeader className="gap-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary/10">
              <Sparkles className="size-3.5 text-primary" />
            </span>
            AI insights
          </CardTitle>
          <Badge variant="secondary" className="text-[10px] font-normal text-muted-foreground">
            auto-generated from current data
          </Badge>
        </div>
        <CardDescription className="text-xs">
          What stands out across customers, products and features in this snapshot.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {insights.map((it) => {
            const t = TONE[it.tone];
            return (
              <div key={it.id} className={cn("flex flex-col gap-1 rounded-lg border p-3", t.ring)}>
                <div className="flex items-start gap-2">
                  <t.icon className={cn("mt-0.5 size-4 shrink-0", t.dot)} />
                  <span className="text-sm font-semibold leading-snug">{it.title}</span>
                </div>
                <p className="pl-6 text-xs leading-relaxed text-muted-foreground">{it.detail}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
