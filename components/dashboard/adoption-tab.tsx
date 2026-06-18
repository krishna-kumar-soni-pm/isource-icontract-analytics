"use client";

import { useMemo } from "react";
import { TrendingDown, Sparkles } from "lucide-react";
import type { Company, Feature } from "@/lib/types";
import { adoptionBand } from "@/lib/analytics";
import { PRODUCT_COLOR } from "@/lib/colors";
import { compact, pct } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "./section";
import { ProductBadge } from "./badges";
import { ColumnChart, DepthScatter } from "./charts";

const BAND_ORDER = [
  "0% — Dormant",
  "1–25% — Low",
  "26–50% — Moderate",
  "51–75% — High",
  "76–100% — Power user",
];
const BAND_COLOR: Record<string, string> = {
  "0% — Dormant": "var(--muted-foreground)",
  "1–25% — Low": "var(--chart-5)",
  "26–50% — Moderate": "var(--chart-3)",
  "51–75% — High": "var(--chart-2)",
  "76–100% — Power user": "var(--success)",
};

export function AdoptionTab({
  companies,
  features,
}: {
  companies: Company[];
  features: Feature[];
}) {
  const customerBands = useMemo(() => {
    const c: Record<string, number> = {};
    for (const co of companies) {
      const b = adoptionBand(co.adoptionRate);
      c[b] = (c[b] ?? 0) + 1;
    }
    return BAND_ORDER.filter((b) => c[b]).map((b) => ({
      label: b.split(" — ")[1],
      value: c[b] ?? 0,
      fill: BAND_COLOR[b],
    }));
  }, [companies]);

  const featureBands = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of features) {
      const b = adoptionBand(f.adoptionRate);
      c[b] = (c[b] ?? 0) + 1;
    }
    return BAND_ORDER.filter((b) => c[b]).map((b) => ({
      label: b.split(" — ")[1],
      value: c[b] ?? 0,
      fill: BAND_COLOR[b],
    }));
  }, [features]);

  const scatter = useMemo(
    () =>
      features
        .filter((f) => f.companiesAdopted > 0 && f.avgPerUser > 0)
        .map((f) => ({
          x: f.companiesAdopted,
          y: f.avgPerUser,
          z: f.totalOccurrences,
          name: f.name,
          fill: PRODUCT_COLOR[f.product],
        })),
    [features],
  );

  const dormant = useMemo(
    () => features.filter((f) => f.totalOccurrences === 0).sort((a, b) => a.name.localeCompare(b.name)),
    [features],
  );

  const opportunities = useMemo(
    () =>
      features
        .filter((f) => f.companiesAvailable >= 5 && f.adoptionRate > 0 && f.adoptionRate < 35)
        .sort((a, b) => b.totalOccurrences - a.totalOccurrences)
        .slice(0, 8),
    [features],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Customer adoption distribution"
          description="How many features each customer actively uses, as a share of what's available to them"
        >
          <ColumnChart data={customerBands} valueLabel="Customers" height={240} />
        </SectionCard>
        <SectionCard
          title="Feature adoption distribution"
          description="How widely each feature is adopted across the customers that have access"
        >
          <ColumnChart data={featureBands} valueLabel="Features" height={240} />
        </SectionCard>
      </div>

      <SectionCard
        title="Reach vs. engagement depth"
        description="Each bubble is a feature — horizontal: how many customers adopted it · vertical: average interactions per user · size: total volume"
      >
        <DepthScatter data={scatter} />
        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: PRODUCT_COLOR.iSource }} />
            iSource
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: PRODUCT_COLOR.iContract }} />
            iContract
          </span>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Adoption opportunities"
          description="Active features with low reach — candidates for enablement"
          action={<Sparkles className="size-4 text-warning" />}
        >
          {opportunities.length ? (
            <div className="flex flex-col divide-y">
              {opportunities.map((f) => (
                <div key={f.name} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="truncate text-sm" title={f.name}>
                      {f.name.replace(/^i(Source|Contract)\s*[|\-]\s*/i, "")}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <ProductBadge product={f.product} className="px-1 py-0 text-[10px]" />
                      <span className="text-xs text-muted-foreground">
                        {compact(f.totalOccurrences)} interactions
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-warning border-warning/25 bg-warning/10">
                    {pct(f.adoptionRate, 0)} · {f.companiesAdopted}/{f.companiesAvailable}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No low-reach active features in the current selection.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Dormant features"
          description="Tracked but never triggered in this selection — review for relevance or rollout gaps"
          action={<TrendingDown className="size-4 text-muted-foreground" />}
        >
          {dormant.length ? (
            <div className="flex flex-wrap gap-1.5">
              {dormant.map((f) => (
                <Badge
                  key={`${f.product}|${f.name}`}
                  variant="outline"
                  className="max-w-full font-normal text-muted-foreground"
                  title={f.name}
                >
                  <span className="truncate">
                    {f.name.replace(/^i(Source|Contract)\s*[|\-]\s*/i, "")}
                  </span>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Every tracked feature has activity. 🎉
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
