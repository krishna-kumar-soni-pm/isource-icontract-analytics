import type { Company } from "./types";

export type SegmentKey =
  | "champion"
  | "expanding"
  | "focused"
  | "nascent"
  | "at-risk"
  | "dormant";

export interface SegmentDef {
  key: SegmentKey;
  label: string;
  description: string;
  color: string; // css var
  tone: string; // badge classes
}

export const SEGMENTS: Record<SegmentKey, SegmentDef> = {
  champion: {
    key: "champion",
    label: "Champion",
    description: "Broad adoption and high usage — active recently.",
    color: "var(--success)",
    tone: "bg-success/10 text-success border-success/20",
  },
  expanding: {
    key: "expanding",
    label: "Expanding",
    description: "Uses many features but at lighter volume — growing.",
    color: "var(--chart-2)",
    tone: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  },
  focused: {
    key: "focused",
    label: "Power-focused",
    description: "Heavy usage concentrated in a few features.",
    color: "var(--chart-1)",
    tone: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  },
  nascent: {
    key: "nascent",
    label: "Nascent",
    description: "Low breadth and low volume — early or under-enabled.",
    color: "var(--chart-3)",
    tone: "bg-chart-3/10 text-chart-3 border-chart-3/25",
  },
  "at-risk": {
    key: "at-risk",
    label: "At risk",
    description: "No activity in the last 30 days.",
    color: "var(--warning)",
    tone: "bg-warning/10 text-warning border-warning/25",
  },
  dormant: {
    key: "dormant",
    label: "Dormant",
    description: "No activity in 90+ days, or never active.",
    color: "var(--muted-foreground)",
    tone: "bg-muted text-muted-foreground border-border",
  },
};

export const SEGMENT_ORDER: SegmentKey[] = [
  "champion",
  "expanding",
  "focused",
  "nascent",
  "at-risk",
  "dormant",
];

/**
 * Classify a customer. Recency gates first (engagement), then a 2×2 of
 * breadth (adoption rate) × volume (total interactions vs the cohort median).
 */
export function classifyCompany(c: Company, volumeMedian: number): SegmentKey {
  const days = c.daysSinceActive;
  if (days === null || days > 90) return "dormant";
  if (days > 30) return "at-risk";
  const broad = c.adoptionRate >= 35;
  const heavy = c.totalOccurrences >= volumeMedian;
  if (broad && heavy) return "champion";
  if (broad && !heavy) return "expanding";
  if (!broad && heavy) return "focused";
  return "nascent";
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function withSegments(companies: Company[]): (Company & { segment: SegmentKey })[] {
  const med = median(companies.map((c) => c.totalOccurrences));
  return companies.map((c) => ({ ...c, segment: classifyCompany(c, med) }));
}

/**
 * Heatmap intensity for an occurrence count, on a log scale relative to max.
 * Returns 0 (no data) … 1 (max). Use to interpolate a single-hue color.
 */
export function heatIntensity(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.log1p(value) / Math.log1p(max);
}

/** Background color for a heatmap cell given intensity 0..1 (light-mode blue ramp). */
export function heatColor(intensity: number): string {
  if (intensity <= 0) return "transparent";
  // lightness 96% → 42%, chroma ramps up with intensity
  const l = 0.96 - intensity * 0.5;
  const c = 0.03 + intensity * 0.14;
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} 256)`;
}

/** Readable text color over a heat cell of given intensity. */
export function heatText(intensity: number): string {
  return intensity > 0.55 ? "oklch(1 0 0)" : "var(--foreground)";
}

/** Strip the product prefix to get a compact-but-complete feature label. */
export function shortFeatureName(name: string): string {
  return name
    .replace(/^i(Source|Contract)\s*[|\-]\s*/i, "")
    .replace(/^i(Source|Contract)\s*/i, "")
    .trim();
}
