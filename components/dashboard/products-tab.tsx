"use client";

import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Company, Datum, Feature, Product } from "@/lib/types";
import { PRODUCT_COLOR } from "@/lib/colors";
import { compact, fmt, pct } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SectionCard } from "./section";
import { ProductBadge } from "./badges";
import { BarList } from "./bar-list";
import { InsightCallouts } from "./insight-callout";
import { insightsFor, type Insight } from "@/lib/insights";

interface ProductRollup {
  product: Product;
  customers: number;
  activeCustomers: number;
  occurrences: number;
  activeUsers: number;
  features: number;
  adoptedFeatures: number;
  adoptionRate: number;
  avgPerCustomer: number;
}

function rollup(records: Datum[], companies: Company[], product: Product): ProductRollup {
  const pr = records.filter((r) => r.product === product);
  const comps = companies.filter((c) => c.products.includes(product));
  const adopted = pr.filter((r) => r.adopted);
  const occ = pr.reduce((a, r) => a + r.occurrences, 0);
  const activeUsers = comps.reduce(
    (a, c) => a + ((product === "iSource" ? c.iSource?.users : c.iContract?.users) ?? 0),
    0,
  );
  const activeCustomers = comps.filter((c) =>
    (product === "iSource" ? c.iSource : c.iContract)?.featuresAdopted,
  ).length;
  return {
    product,
    customers: comps.length,
    activeCustomers,
    occurrences: occ,
    activeUsers,
    features: new Set(pr.map((r) => r.name)).size,
    adoptedFeatures: new Set(adopted.map((r) => r.name)).size,
    adoptionRate: pr.length ? (100 * adopted.length) / pr.length : 0,
    avgPerCustomer: comps.length ? occ / comps.length : 0,
  };
}

function MetricRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">
        {value}
        {sub && <span className="ml-1 text-xs font-normal text-muted-foreground">{sub}</span>}
      </span>
    </div>
  );
}

function ProductCard({
  r,
  features,
}: {
  r: ProductRollup;
  features: Feature[];
}) {
  const top = features
    .filter((f) => f.product === r.product && f.totalOccurrences > 0)
    .slice(0, 8)
    .map((f) => ({
      label: f.name.replace(/^i(Source|Contract)\s*[|\-]\s*/i, ""),
      value: f.totalOccurrences,
      sub: f.category,
    }));

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ProductBadge product={r.product} />
            <span className="text-muted-foreground">·</span>
            <span className="text-sm font-normal text-muted-foreground">
              {r.product === "iSource" ? "Sourcing" : "Contract management"}
            </span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-x-6">
          <div>
            <MetricRow label="Customers" value={fmt(r.customers)} />
            <Separator />
            <MetricRow label="Active customers" value={fmt(r.activeCustomers)} />
            <Separator />
            <MetricRow label="Active users" value={compact(r.activeUsers)} />
          </div>
          <div>
            <MetricRow label="Interactions" value={compact(r.occurrences)} />
            <Separator />
            <MetricRow label="Tracked features" value={`${r.adoptedFeatures}/${r.features}`} sub="adopted" />
            <Separator />
            <MetricRow label="Avg. adoption" value={pct(r.adoptionRate, 1)} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <ArrowUpRight className="size-3.5" />
            Top features by interactions
          </div>
          <BarList data={top} color={PRODUCT_COLOR[r.product]} valueFormatter={compact} />
        </div>
      </CardContent>
    </Card>
  );
}

export function ProductsTab({
  insights,
  records,
  companies,
  features,
}: {
  insights: Insight[];
  records: Datum[];
  companies: Company[];
  features: Feature[];
}) {
  const rollups = useMemo(
    () =>
      (["iSource", "iContract"] as Product[])
        .map((p) => rollup(records, companies, p))
        .filter((r) => r.customers > 0),
    [records, companies],
  );

  return (
    <div className="flex flex-col gap-4">
      <InsightCallouts insights={insightsFor(insights, "products")} />
      {rollups.length > 1 && (
        <SectionCard
          title="Product footprint at a glance"
          description="iSource (sourcing) vs iContract (contract management) — relative scale of usage"
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {rollups.map((r) => (
              <div key={r.product} className="flex flex-col gap-1">
                <ProductBadge product={r.product} className="w-fit" />
                <span className="mt-1 text-2xl font-semibold tabular-nums">
                  {compact(r.occurrences)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {r.customers} customers · {compact(r.activeUsers)} users
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {rollups.map((r) => (
          <ProductCard key={r.product} r={r} features={features} />
        ))}
      </div>
    </div>
  );
}
