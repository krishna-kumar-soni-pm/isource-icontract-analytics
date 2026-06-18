import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRODUCT_BADGE, adoptionTone, recencyTone } from "@/lib/colors";
import { pct } from "@/lib/format";
import type { Product, Recency } from "@/lib/types";

export function ProductBadge({ product, className }: { product: Product; className?: string }) {
  return (
    <Badge variant="outline" className={cn(PRODUCT_BADGE[product], "font-medium", className)}>
      {product}
    </Badge>
  );
}

export function KindBadge({ kind }: { kind: "Event" | "Page" }) {
  return (
    <Badge variant="secondary" className="font-normal text-muted-foreground">
      {kind}
    </Badge>
  );
}

export function RecencyBadge({ recency }: { recency: Recency }) {
  return (
    <Badge variant="outline" className={cn(recencyTone(recency), "font-medium whitespace-nowrap")}>
      {recency}
    </Badge>
  );
}

/** Horizontal adoption meter with % label. */
export function AdoptionMeter({
  rate,
  className,
  showLabel = true,
}: {
  rate: number;
  className?: string;
  showLabel?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 w-full max-w-28 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.max(rate, 0)}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn("w-11 text-right text-xs font-semibold tabular-nums", adoptionTone(rate))}>
          {pct(rate, 0)}
        </span>
      )}
    </div>
  );
}
