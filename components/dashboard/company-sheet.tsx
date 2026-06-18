"use client";

import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import type { Company, Datum } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { compact, fmt, fmtDate, initials, pct, relativeDays } from "@/lib/format";
import { ProductBadge, RecencyBadge, KindBadge, AdoptionMeter } from "./badges";
import { adoptionTone } from "@/lib/colors";
import { SEGMENTS, type SegmentKey } from "@/lib/segments";
import { cn } from "@/lib/utils";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function CompanySheet({
  company,
  records,
  onOpenChange,
}: {
  company: (Company & { segment?: SegmentKey }) | null;
  records: Datum[];
  onOpenChange: (open: boolean) => void;
}) {
  const rows = useMemo(() => {
    if (!company) return [];
    return records
      .filter((r) => r.company === company.name)
      .sort((a, b) => b.occurrences - a.occurrences);
  }, [company, records]);

  return (
    <Sheet open={!!company} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-xl">
        {company && (
          <>
            <SheetHeader className="gap-3 border-b">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                  {initials(company.name)}
                </div>
                <div className="min-w-0">
                  <SheetTitle className="truncate text-base">{company.name}</SheetTitle>
                  <SheetDescription className="flex flex-wrap items-center gap-1.5">
                    {company.products.map((p) => (
                      <ProductBadge key={p} product={p} />
                    ))}
                    {company.segment && (
                      <Badge
                        variant="outline"
                        className={cn("font-medium", SEGMENTS[company.segment].tone)}
                      >
                        {SEGMENTS[company.segment].label}
                      </Badge>
                    )}
                    <RecencyBadge recency={company.recency} />
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="h-[calc(100svh-5.5rem)]">
              <div className="flex flex-col gap-5 p-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat label="Interactions" value={compact(company.totalOccurrences)} />
                  <Stat label="Active users" value={fmt(company.activeUsers)} />
                  <Stat
                    label="Adoption"
                    value={pct(company.adoptionRate, 0)}
                    sub={`${company.featuresAdopted}/${company.featuresAvailable} features`}
                  />
                  <Stat label="Last seen" value={relativeDays(company.daysSinceActive)} />
                </div>

                {/* Per-product breakdown */}
                {company.products.length > 0 && (
                  <div className="grid gap-2">
                    {(["iSource", "iContract"] as const).map((p) => {
                      const s = p === "iSource" ? company.iSource : company.iContract;
                      if (!s) return null;
                      return (
                        <div key={p} className="rounded-lg border p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <ProductBadge product={p} />
                            <span className="text-sm font-semibold tabular-nums">
                              {compact(s.occurrences)}{" "}
                              <span className="text-xs font-normal text-muted-foreground">
                                interactions
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <span>{s.users} users</span>
                            <span>
                              {s.featuresAdopted}/{s.featuresAvailable} features
                            </span>
                            <span className={cn("font-medium", adoptionTone(s.adoptionRate))}>
                              {pct(s.adoptionRate, 0)} adopted
                            </span>
                          </div>
                          <AdoptionMeter rate={s.adoptionRate} className="mt-2" showLabel={false} />
                        </div>
                      );
                    })}
                  </div>
                )}

                <Separator />

                {/* Feature breakdown table */}
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    Feature activity ({rows.length})
                  </div>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Feature</TableHead>
                          <TableHead className="text-right text-xs">Users</TableHead>
                          <TableHead className="text-right text-xs">Count</TableHead>
                          <TableHead className="text-right text-xs">Last</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r, i) => (
                          <TableRow key={i} className={cn(!r.adopted && "opacity-55")}>
                            <TableCell className="align-top">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs leading-snug">
                                  {r.name.replace(/^i(Source|Contract)\s*[|\-]\s*/i, "")}
                                </span>
                                <div className="flex items-center gap-1">
                                  <ProductBadge product={r.product} className="px-1 py-0 text-[10px]" />
                                  <KindBadge kind={r.kind} />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs tabular-nums">
                              {r.users || "—"}
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium tabular-nums">
                              {r.occurrences ? fmt(r.occurrences) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {r.lastActivity ? fmtDate(r.lastActivity) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
