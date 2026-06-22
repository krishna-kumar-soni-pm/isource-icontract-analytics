"use client";

import { useMemo } from "react";
import type { Company, Datum, Feature } from "@/lib/types";
import { RECENCY_ORDER, countBy, sumBy } from "@/lib/analytics";
import { SEGMENTS, SEGMENT_ORDER, withSegments } from "@/lib/segments";
import { CHART_COLORS, PRODUCT_COLOR, RECENCY_COLOR } from "@/lib/colors";
import { compact, fmtMonth, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Insight } from "@/lib/insights";
import { SectionCard, LegendRow } from "./section";
import { ColumnChart, DonutChart, QuadrantScatter } from "./charts";
import { BarList } from "./bar-list";
import { InsightsPanel } from "./insights-panel";

export function OverviewTab({
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
  const segmented = useMemo(() => withSegments(companies), [companies]);
  const headlineInsights = useMemo(() => insights.filter((i) => i.headline), [insights]);

  const productSplit = useMemo(() => {
    const occ = sumBy(records, (r) => r.product, (r) => r.occurrences);
    const total = Object.values(occ).reduce((a, b) => a + b, 0);
    return {
      total,
      data: (["iSource", "iContract"] as const)
        .filter((p) => occ[p])
        .map((p) => ({ name: p, value: occ[p] ?? 0, fill: PRODUCT_COLOR[p] })),
    };
  }, [records]);

  const recencyData = useMemo(() => {
    const c = countBy(companies, (x) => x.recency);
    return RECENCY_ORDER.filter((r) => c[r]).map((r) => ({
      label: r.replace("Last ", "").replace(" days", "d").replace("Older than 90d", ">90d"),
      value: c[r] ?? 0,
      fill: RECENCY_COLOR[r],
    }));
  }, [companies]);

  const categoryData = useMemo(() => {
    const occ = sumBy(records, (r) => r.category, (r) => r.occurrences);
    return Object.entries(occ)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, value], i) => ({ name, value, fill: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [records]);
  const categoryTotal = categoryData.reduce((a, d) => a + d.value, 0);

  const segCounts = useMemo(() => {
    const c = countBy(segmented, (x) => x.segment);
    return SEGMENT_ORDER.map((k) => ({ ...SEGMENTS[k], count: c[k] ?? 0 })).filter(
      (s) => s.count > 0,
    );
  }, [segmented]);
  const segTotal = segmented.length || 1;

  const funnel = useMemo(() => {
    const n = companies.length;
    const activated = companies.filter((c) => c.featuresAdopted >= 1).length;
    const multi = companies.filter((c) => c.featuresAdopted >= 3).length;
    const broad = companies.filter((c) => c.adoptionRate >= 35).length;
    const champions = segmented.filter((c) => c.segment === "champion").length;
    return [
      { label: "All customers", value: n, hint: "tracked in Userpilot" },
      { label: "Activated", value: activated, hint: "≥1 feature used" },
      { label: "Multi-feature", value: multi, hint: "≥3 features used" },
      { label: "Broad adopters", value: broad, hint: "≥35% of features" },
      { label: "Champions", value: champions, hint: "broad + active <30d" },
    ];
  }, [companies, segmented]);

  const quadrant = useMemo(
    () =>
      segmented
        .filter((c) => c.totalOccurrences > 0)
        .map((c) => ({
          x: c.adoptionRate,
          y: Math.max(c.totalOccurrences, 1),
          z: Math.max(c.activeUsers, 1),
          name: c.name,
          fill: SEGMENTS[c.segment].color,
          segment: SEGMENTS[c.segment].label,
        })),
    [segmented],
  );

  const topFeatures = useMemo(
    () =>
      features
        .filter((f) => f.totalOccurrences > 0)
        .slice(0, 8)
        .map((f) => ({ label: f.name, value: f.totalOccurrences, sub: `${f.product} · ${f.category}` })),
    [features],
  );

  const topCompanies = useMemo(
    () =>
      companies
        .filter((c) => c.totalOccurrences > 0)
        .slice(0, 8)
        .map((c) => ({ label: c.name, value: c.totalOccurrences, sub: c.products.join(" · ") })),
    [companies],
  );

  const rollout = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of features) {
      if (f.insertedAt) {
        const m = f.insertedAt.slice(0, 7);
        c[m] = (c[m] ?? 0) + 1;
      }
    }
    return Object.entries(c)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([m, v]) => ({ label: fmtMonth(m), value: v }));
  }, [features]);

  return (
    <div className="flex flex-col gap-4">
      <InsightsPanel insights={headlineInsights} />

      {/* Distribution row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Interactions by product" description="Share of total events & page views">
          <div className="flex flex-col items-center gap-3">
            <DonutChart data={productSplit.data} centerValue={compact(productSplit.total)} centerLabel="interactions" />
            <div className="w-full">
              {productSplit.data.map((d) => (
                <LegendRow key={d.name} color={d.fill} label={d.name} value={compact(d.value)} sub={pct((d.value / (productSplit.total || 1)) * 100, 0)} />
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Customer recency" description="Customers grouped by their last activity">
          <ColumnChart data={recencyData} valueLabel="Customers" height={232} />
        </SectionCard>

        <SectionCard title="Interactions by category" description="Top categories by volume">
          <div className="flex flex-col items-center gap-3">
            <DonutChart data={categoryData} centerValue={compact(categoryTotal)} centerLabel="in top cats" />
            <div className="w-full">
              {categoryData.slice(0, 5).map((d) => (
                <LegendRow key={d.name} color={d.fill} label={d.name} value={compact(d.value)} sub={pct((d.value / (categoryTotal || 1)) * 100, 0)} />
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Segments + funnel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <SectionCard
          title="Customer segments"
          description="Every customer classified by adoption breadth, usage volume and recency"
          className="lg:col-span-3"
        >
          <div className="flex flex-col gap-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {segCounts.map((s) => (
                <div
                  key={s.key}
                  style={{ width: `${(s.count / segTotal) * 100}%`, background: s.color }}
                  title={`${s.label}: ${s.count}`}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {segCounts.map((s) => (
                <div key={s.key} className="flex items-start gap-2">
                  <span className="mt-1 size-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-medium">{s.label}</span>
                      <span className="text-sm font-semibold tabular-nums">{s.count}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {pct((s.count / segTotal) * 100, 0)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Adoption funnel"
          description="How customers progress from activation to power use"
          className="lg:col-span-2"
        >
          <div className="flex flex-col gap-2">
            {funnel.map((stage, i) => {
              const widthPct = (stage.value / (funnel[0].value || 1)) * 100;
              const conv = i === 0 ? 100 : (stage.value / (funnel[i - 1].value || 1)) * 100;
              return (
                <div key={stage.label} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-medium">{stage.label}</span>
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-foreground tabular-nums">{stage.value}</span>
                      {i > 0 && <span className="ml-1.5 tabular-nums">{pct(conv, 0)}</span>}
                    </span>
                  </div>
                  <div className="h-6 w-full overflow-hidden rounded-md bg-muted">
                    <div
                      className={cn("flex h-full items-center rounded-md bg-chart-1/85 px-2")}
                      style={{ width: `${Math.max(widthPct, 6)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{stage.hint}</span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* Quadrant */}
      <SectionCard
        title="Customer landscape"
        description="Each bubble is a customer — horizontal: adoption breadth · vertical: total interactions (log) · size: active users · color: segment"
      >
        <QuadrantScatter data={quadrant} xMid={35} />
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {SEGMENT_ORDER.map((k) => SEGMENTS[k]).map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </SectionCard>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Top features by interactions" description="Most-used events & pages across all customers">
          <BarList data={topFeatures} color="var(--chart-1)" valueFormatter={compact} />
        </SectionCard>
        <SectionCard title="Top customers by interactions" description="Most active accounts by total volume">
          <BarList data={topCompanies} color="var(--chart-2)" valueFormatter={compact} />
        </SectionCard>
      </div>

      {rollout.length > 1 && (
        <SectionCard
          title="Feature instrumentation timeline"
          description="When tracked features were first instrumented in Userpilot"
        >
          <ColumnChart data={rollout} valueLabel="Features" color="var(--chart-4)" height={220} />
        </SectionCard>
      )}
    </div>
  );
}
