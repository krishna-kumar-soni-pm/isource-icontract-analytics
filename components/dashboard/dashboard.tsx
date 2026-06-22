"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, Boxes, Building2, ListTree, Target, Grid3x3 } from "lucide-react";
import type { DashboardData } from "@/lib/types";
import {
  DEFAULT_FILTERS,
  aggregateCompanies,
  aggregateFeatures,
  applyFilters,
  computeKpis,
  type Filters,
} from "@/lib/analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { fmtDate } from "@/lib/format";
import { KpiCards } from "./kpi-cards";
import { FilterBar } from "./filter-bar";
import { OverviewTab } from "./overview-tab";
import { ProductsTab } from "./products-tab";
import { CompaniesTab } from "./companies-tab";
import { FeaturesTab } from "./features-tab";
import { AdoptionTab } from "./adoption-tab";
import { MatrixTab } from "./matrix-tab";
import { SyncStatus } from "./sync-status";

const TABS = [
  { value: "overview", label: "Overview", icon: LayoutGrid },
  { value: "products", label: "Products", icon: Boxes },
  { value: "companies", label: "Customers", icon: Building2 },
  { value: "features", label: "Features", icon: ListTree },
  { value: "matrix", label: "Matrix", icon: Grid3x3 },
  { value: "adoption", label: "Adoption", icon: Target },
];

export function Dashboard({
  data,
  lastSyncedAt = null,
}: {
  data: DashboardData;
  lastSyncedAt?: string | null;
}) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const categories = useMemo(
    () => [...new Set(data.records.map((r) => r.category))].sort(),
    [data.records],
  );

  const filtered = useMemo(() => applyFilters(data.records, filters), [data.records, filters]);
  const companies = useMemo(() => aggregateCompanies(filtered), [filtered]);
  const features = useMemo(() => aggregateFeatures(filtered), [filtered]);
  const kpis = useMemo(() => computeKpis(filtered, companies), [filtered, companies]);

  const empty = filtered.length === 0;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header — fixed top bar */}
      <header className="fixed inset-x-0 top-0 z-40 border-b bg-background/90 shadow-xs backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-2.5 md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              Z
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight tracking-tight">
                iSource &amp; iContract Customer Analytics
              </h1>
              <p className="text-xs leading-tight text-muted-foreground">
                Zycus procurement suite · Userpilot product usage · data through{" "}
                {fmtDate(data.summary.dataThrough)}
              </p>
            </div>
          </div>
          <SyncStatus lastSyncedAt={lastSyncedAt} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-5 pt-[68px] md:px-6">
        <Tabs defaultValue="overview" className="gap-4">
          <div className="flex flex-col gap-3">
            <KpiCards kpis={kpis} />

            <div className="flex items-center justify-between gap-3">
              <TabsList className="h-9">
                {TABS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-xs">
                    <t.icon className="size-3.5" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <FilterBar filters={filters} setFilters={setFilters} categories={categories} />
          </div>

          {empty ? (
            <Empty className="rounded-xl border bg-card py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Target />
                </EmptyMedia>
                <EmptyTitle>No matching data</EmptyTitle>
                <EmptyDescription>
                  No events or pages match the current filters. Try clearing or widening them.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <TabsContent value="overview">
                <OverviewTab data={data} records={filtered} companies={companies} features={features} />
              </TabsContent>
              <TabsContent value="products">
                <ProductsTab records={filtered} companies={companies} features={features} />
              </TabsContent>
              <TabsContent value="companies">
                <CompaniesTab companies={companies} allRecords={data.records} />
              </TabsContent>
              <TabsContent value="features">
                <FeaturesTab features={features} />
              </TabsContent>
              <TabsContent value="matrix">
                <MatrixTab records={filtered} />
              </TabsContent>
              <TabsContent value="adoption">
                <AdoptionTab companies={companies} features={features} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>

      <footer className="border-t py-4">
        <div className="mx-auto max-w-[1400px] px-4 text-xs text-muted-foreground md:px-6">
          {data.summary.totals.trackedRows.toLocaleString()} customer×feature observations ·{" "}
          {data.summary.totals.companiesBothProducts} customers use both products · iSource Pages
          not tracked in Userpilot (events only).
        </div>
      </footer>
    </div>
  );
}
