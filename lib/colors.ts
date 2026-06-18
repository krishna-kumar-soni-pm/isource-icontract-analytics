import type { Product, Recency } from "./types";

export const PRODUCT_COLOR: Record<Product, string> = {
  iSource: "var(--isource)",
  iContract: "var(--icontract)",
};

/** Tailwind-friendly badge classes per product (light mode). */
export const PRODUCT_BADGE: Record<Product, string> = {
  iSource: "bg-isource/10 text-isource border-isource/20",
  iContract: "bg-icontract/10 text-icontract border-icontract/20",
};

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

export const RECENCY_COLOR: Record<Recency, string> = {
  "Last 7 days": "var(--success)",
  "Last 30 days": "var(--chart-2)",
  "Last 90 days": "var(--warning)",
  "Older than 90 days": "var(--chart-7)",
  Never: "var(--muted-foreground)",
};

export function recencyTone(r: Recency): string {
  switch (r) {
    case "Last 7 days":
      return "bg-success/10 text-success border-success/20";
    case "Last 30 days":
      return "bg-chart-2/10 text-chart-2 border-chart-2/20";
    case "Last 90 days":
      return "bg-warning/10 text-warning border-warning/25";
    case "Older than 90 days":
      return "bg-chart-7/10 text-chart-7 border-chart-7/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function adoptionTone(rate: number): string {
  if (rate === 0) return "text-muted-foreground";
  if (rate <= 25) return "text-danger";
  if (rate <= 50) return "text-warning";
  if (rate <= 75) return "text-chart-2";
  return "text-success";
}
