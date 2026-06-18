"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Company, Datum } from "@/lib/types";
import { adoptionBand } from "@/lib/analytics";
import {
  SEGMENTS,
  SEGMENT_ORDER,
  withSegments,
  type SegmentKey,
} from "@/lib/segments";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { compact, fmt, initials, relativeDays } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SectionCard } from "./section";
import { AdoptionMeter, ProductBadge } from "./badges";
import { SortHeader, useSortable } from "./use-sortable";
import { CompanySheet } from "./company-sheet";

type GroupBy = "none" | "segment" | "products" | "recency" | "adoption";
type Row = Company & { segment: SegmentKey };
const COLS = 8;

function productGroup(c: Company): string {
  if (c.products.length > 1) return "Uses both products";
  return `${c.products[0]} only`;
}

export function CompaniesTab({
  companies,
  allRecords,
}: {
  companies: Company[];
  allRecords: Datum[];
}) {
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [selected, setSelected] = useState<Row | null>(null);

  const rows = useMemo<Row[]>(() => withSegments(companies), [companies]);
  const maxOcc = useMemo(() => Math.max(0, ...rows.map((c) => c.totalOccurrences)), [rows]);
  const { sorted, sortKey, sortDir, toggle } = useSortable(rows, "totalOccurrences");

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "", label: "", rows: sorted }];
    const keyFn = (c: Row) =>
      groupBy === "segment"
        ? SEGMENTS[c.segment].label
        : groupBy === "products"
          ? productGroup(c)
          : groupBy === "recency"
            ? c.recency
            : adoptionBand(c.adoptionRate);
    const order = (k: string) =>
      groupBy === "segment" ? SEGMENT_ORDER.findIndex((s) => SEGMENTS[s].label === k) : 0;
    const map = new Map<string, Row[]>();
    for (const c of sorted) {
      const k = keyFn(c);
      const arr = map.get(k) ?? [];
      arr.push(c);
      map.set(k, arr);
    }
    return [...map.entries()]
      .map(([key, rs]) => ({ key, label: key, rows: rs }))
      .sort((a, b) =>
        groupBy === "segment" ? order(a.key) - order(b.key) : b.rows.length - a.rows.length,
      );
  }, [sorted, groupBy]);

  return (
    <>
      <SectionCard
        title="Customer directory"
        description={`${companies.length} customers · click any row for a full account breakdown`}
        action={
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="h-8 w-[170px] text-xs" size="sm">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="none">No grouping</SelectItem>
                <SelectItem value="segment">Group: segment</SelectItem>
                <SelectItem value="products">Group: products used</SelectItem>
                <SelectItem value="recency">Group: recency</SelectItem>
                <SelectItem value="adoption">Group: adoption band</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        }
        contentClassName="px-0"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader label="Customer" sortKey="name" active={sortKey === "name"} dir={sortDir} onToggle={toggle} />
                <SortHeader label="Products" sortKey="isProspectBoth" active={sortKey === "isProspectBoth"} dir={sortDir} onToggle={toggle} />
                <SortHeader label="Segment" sortKey="segment" active={sortKey === "segment"} dir={sortDir} onToggle={toggle} />
                <SortHeader label="Interactions" sortKey="totalOccurrences" active={sortKey === "totalOccurrences"} dir={sortDir} onToggle={toggle} align="right" />
                <SortHeader label="Users" sortKey="activeUsers" active={sortKey === "activeUsers"} dir={sortDir} onToggle={toggle} align="right" />
                <SortHeader label="Features" sortKey="featuresAdopted" active={sortKey === "featuresAdopted"} dir={sortDir} onToggle={toggle} align="right" />
                <SortHeader label="Adoption" sortKey="adoptionRate" active={sortKey === "adoptionRate"} dir={sortDir} onToggle={toggle} />
                <SortHeader label="Last activity" sortKey="daysSinceActive" active={sortKey === "daysSinceActive"} dir={sortDir} onToggle={toggle} align="right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <Fragment key={g.key || "all"}>
                  {g.key && (
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={COLS} className="py-1.5 text-xs font-medium text-muted-foreground">
                        {g.label}
                        <span className="ml-2 text-muted-foreground/70">{g.rows.length}</span>
                      </TableCell>
                    </TableRow>
                  )}
                  {g.rows.map((c) => (
                    <TableRow key={c.name} className="cursor-pointer" onClick={() => setSelected(c)}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
                            {initials(c.name)}
                          </div>
                          <span className="font-medium">{c.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.products.map((p) => (
                            <ProductBadge key={p} product={p} className="px-1.5 py-0 text-[10px]" />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("whitespace-nowrap font-medium", SEGMENTS[c.segment].tone)}
                        >
                          {SEGMENTS[c.segment].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-medium tabular-nums">{compact(c.totalOccurrences)}</span>
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-chart-1"
                              style={{ width: `${maxOcc ? (c.totalOccurrences / maxOcc) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(c.activeUsers)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {c.featuresAdopted}/{c.featuresAvailable}
                      </TableCell>
                      <TableCell>
                        <AdoptionMeter rate={c.adoptionRate} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="whitespace-nowrap text-xs text-muted-foreground">
                            {relativeDays(c.daysSinceActive)}
                          </span>
                          <ChevronRight className="size-4 text-muted-foreground/50" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <CompanySheet
        company={selected}
        records={allRecords}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </>
  );
}
