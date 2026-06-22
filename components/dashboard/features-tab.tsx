"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Feature } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { compact, fmt, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PRODUCT_COLOR } from "@/lib/colors";
import { SectionCard } from "./section";
import { AdoptionMeter, KindBadge, ProductBadge } from "./badges";
import { SortHeader, useSortable } from "./use-sortable";
import { BarList } from "./bar-list";

export function FeaturesTab({ features }: { features: Feature[] }) {
  const { sorted, sortKey, sortDir, toggle } = useSortable(features, "totalOccurrences");
  const [open, setOpen] = useState<string | null>(null);

  const topByVolume = useMemo(
    () =>
      features
        .filter((f) => f.totalOccurrences > 0)
        .slice(0, 10)
        .map((f) => ({
          label: f.name.replace(/^i(Source|Contract)\s*[|\-]\s*/i, ""),
          value: f.totalOccurrences,
          sub: `${f.product} · ${f.companiesAdopted}/${f.companiesAvailable} customers`,
        })),
    [features],
  );

  const topByAdoption = useMemo(
    () =>
      [...features]
        .filter((f) => f.companiesAvailable >= 3)
        .sort((a, b) => b.adoptionRate - a.adoptionRate)
        .slice(0, 10)
        .map((f) => ({
          label: f.name.replace(/^i(Source|Contract)\s*[|\-]\s*/i, ""),
          value: f.adoptionRate,
          sub: `${f.companiesAdopted} of ${f.companiesAvailable} customers`,
        })),
    [features],
  );

  const maxOcc = useMemo(
    () => Math.max(0, ...features.map((f) => f.totalOccurrences)),
    [features],
  );

  const fkey = (f: Feature) => `${f.product}|${f.kind}|${f.name}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Most-used features" description="Ranked by total interactions">
          <BarList data={topByVolume} color="var(--chart-1)" valueFormatter={compact} />
        </SectionCard>
        <SectionCard
          title="Most widely adopted"
          description="Reach — share of customers (with access) actively using the feature, for features available to ≥3 customers"
        >
          <BarList
            data={topByAdoption}
            color="var(--chart-3)"
            valueFormatter={(n) => `${Math.round(n)}%`}
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Feature catalog"
        description={`${features.length} tracked events & pages · click a row to see top customers`}
        contentClassName="px-0"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader label="Feature" sortKey="name" active={sortKey === "name"} dir={sortDir} onToggle={toggle} />
                <SortHeader label="Category" sortKey="category" active={sortKey === "category"} dir={sortDir} onToggle={toggle} />
                <SortHeader label="Interactions" sortKey="totalOccurrences" active={sortKey === "totalOccurrences"} dir={sortDir} onToggle={toggle} align="right" />
                <SortHeader label="Users" sortKey="totalUsers" active={sortKey === "totalUsers"} dir={sortDir} onToggle={toggle} align="right" />
                <SortHeader label="Customers" sortKey="companiesAdopted" active={sortKey === "companiesAdopted"} dir={sortDir} onToggle={toggle} align="right" />
                <SortHeader label="Adoption" sortKey="adoptionRate" active={sortKey === "adoptionRate"} dir={sortDir} onToggle={toggle} />
                <SortHeader label="Avg/user" sortKey="avgPerUser" active={sortKey === "avgPerUser"} dir={sortDir} onToggle={toggle} align="right" />
                <SortHeader label="Last seen" sortKey="lastActivity" active={sortKey === "lastActivity"} dir={sortDir} onToggle={toggle} align="right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((f) => {
                const k = fkey(f);
                const isOpen = open === k;
                return (
                  <Fragment key={k}>
                    <TableRow
                      className={cn("cursor-pointer", f.totalOccurrences === 0 && "opacity-60")}
                      onClick={() => setOpen(isOpen ? null : k)}
                    >
                      <TableCell className="min-w-[260px] align-top">
                        <div className="flex items-start gap-1.5">
                          {isOpen ? (
                            <ChevronDown className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
                          )}
                          <div className="flex flex-col gap-1">
                            <span className="font-medium leading-snug">{f.name}</span>
                            <div className="flex items-center gap-1">
                              <ProductBadge product={f.product} className="px-1.5 py-0 text-[10px]" />
                              <KindBadge kind={f.kind} />
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="secondary" className="font-normal text-muted-foreground">
                          {f.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-medium tabular-nums">{compact(f.totalOccurrences)}</span>
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-chart-1"
                              style={{
                                width: `${maxOcc ? (f.totalOccurrences / maxOcc) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-top tabular-nums">{fmt(f.totalUsers)}</TableCell>
                      <TableCell className="text-right align-top tabular-nums text-muted-foreground">
                        {f.companiesAdopted}/{f.companiesAvailable}
                      </TableCell>
                      <TableCell className="align-top">
                        <AdoptionMeter rate={f.adoptionRate} />
                      </TableCell>
                      <TableCell className="text-right align-top tabular-nums">
                        {f.avgPerUser || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right align-top text-xs text-muted-foreground">
                        {fmtDate(f.lastActivity)}
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={8} className="bg-muted/30">
                          <div className="grid gap-3 px-5 py-2 md:grid-cols-2">
                            <div className="flex flex-col gap-1.5">
                              {f.description && (
                                <p className="text-xs text-muted-foreground">{f.description}</p>
                              )}
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                {f.owner && (
                                  <span className="text-muted-foreground">
                                    Owner: <span className="text-foreground">{f.owner}</span>
                                  </span>
                                )}
                                {f.insertedAt && (
                                  <span className="text-muted-foreground">
                                    Instrumented: <span className="text-foreground">{fmtDate(f.insertedAt)}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="mb-1 text-xs font-medium text-muted-foreground">
                                Top customers
                              </div>
                              {f.topCompanies.length ? (
                                <div className="flex flex-col gap-1">
                                  {f.topCompanies.slice(0, 5).map((tc) => {
                                    const max = f.topCompanies[0].occurrences || 1;
                                    return (
                                      <div key={tc.company} className="flex items-center gap-2">
                                        <span className="w-32 shrink-0 truncate text-xs" title={tc.company}>
                                          {tc.company}
                                        </span>
                                        <div className="h-2 grow overflow-hidden rounded-full bg-muted">
                                          <div
                                            className="h-full rounded-full"
                                            style={{
                                              width: `${(tc.occurrences / max) * 100}%`,
                                              background: PRODUCT_COLOR[f.product],
                                            }}
                                          />
                                        </div>
                                        <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums">
                                          {compact(tc.occurrences)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No customer has used this feature yet.</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}
