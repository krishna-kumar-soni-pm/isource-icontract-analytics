import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("shadow-xs", className)}>
      <CardHeader className="gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="grid gap-1">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {description && (
              <CardDescription className="text-xs">{description}</CardDescription>
            )}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className={cn(contentClassName)}>{children}</CardContent>
    </Card>
  );
}

/** Legend row used beside donut charts. */
export function LegendRow({
  color,
  label,
  value,
  sub,
}: {
  color: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex min-w-0 items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-sm" style={{ background: color }} />
        <span className="truncate text-sm">{label}</span>
      </div>
      <div className="flex shrink-0 items-baseline gap-1.5">
        <span className="text-sm font-semibold tabular-nums">{value}</span>
        {sub && <span className="text-xs text-muted-foreground tabular-nums">{sub}</span>}
      </div>
    </div>
  );
}
