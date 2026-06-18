"use client";

import { useMemo, useState } from "react";
import type { Datum, Product } from "@/lib/types";
import {
  heatColor,
  heatIntensity,
  heatText,
  shortFeatureName,
} from "@/lib/segments";
import { compact, fmt, fmtDate, initials } from "@/lib/format";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SectionCard } from "./section";
import { ProductBadge } from "./badges";

type Metric = "occurrences" | "users" | "adopted";

interface Cell {
  occ: number;
  users: number;
  avg: number;
  last: string | null;
  adopted: boolean;
}

export function MatrixTab({ records }: { records: Datum[] }) {
  const productsPresent = useMemo(
    () =>
      (["iContract", "iSource"] as Product[]).filter((p) =>
        records.some((r) => r.product === p),
      ),
    [records],
  );
  const [product, setProduct] = useState<Product>(productsPresent[0] ?? "iContract");
  const [metric, setMetric] = useState<Metric>("occurrences");
  const activeProduct = productsPresent.includes(product) ? product : productsPresent[0];

  const { columns, rows, cellMap, maxVal, rowTotals } = useMemo(() => {
    const pr = records.filter((r) => r.product === activeProduct);

    // Columns = features ordered by total volume
    const featAgg = new Map<string, number>();
    for (const r of pr) featAgg.set(r.name, (featAgg.get(r.name) ?? 0) + r.occurrences);
    const columns = [...featAgg.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    // Rows = companies ordered by total volume
    const compAgg = new Map<string, number>();
    for (const r of pr) compAgg.set(r.company, (compAgg.get(r.company) ?? 0) + r.occurrences);
    const rows = [...compAgg.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
    const rowTotals = new Map(compAgg);

    const cellMap = new Map<string, Cell>();
    let maxVal = 0;
    for (const r of pr) {
      const key = `${r.company}||${r.name}`;
      cellMap.set(key, {
        occ: r.occurrences,
        users: r.users,
        avg: r.avgPerUser,
        last: r.lastActivity,
        adopted: r.adopted,
      });
      const v = metric === "users" ? r.users : r.occurrences;
      if (v > maxVal) maxVal = v;
    }
    return { columns, rows, cellMap, maxVal, rowTotals };
  }, [records, activeProduct, metric]);

  const colMax = useMemo(() => Math.max(0, ...rowTotals.values()), [rowTotals]);

  return (
    <SectionCard
      title="Adoption matrix — customers × features"
      description={`Each cell is one customer's usage of one ${activeProduct} feature. Darker = more activity. Hover any cell for details.`}
      action={
        <div className="flex items-center gap-2">
          {productsPresent.length > 1 && (
            <Select value={activeProduct} onValueChange={(v) => setProduct(v as Product)}>
              <SelectTrigger className="h-8 w-[130px] text-xs" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {productsPresent.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
          <ToggleGroup
            type="single"
            value={metric}
            onValueChange={(v) => v && setMetric(v as Metric)}
            variant="outline"
            className="h-8"
          >
            <ToggleGroupItem value="occurrences" className="px-2.5 text-xs">
              Volume
            </ToggleGroupItem>
            <ToggleGroupItem value="users" className="px-2.5 text-xs">
              Users
            </ToggleGroupItem>
            <ToggleGroupItem value="adopted" className="px-2.5 text-xs">
              Adopted
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      }
      contentClassName="px-0"
    >
      <div className="flex items-center gap-3 px-6 pb-3 text-xs text-muted-foreground">
        <span>{rows.length} customers</span>
        <span>·</span>
        <span>{columns.length} features</span>
        <span>·</span>
        <ProductBadge product={activeProduct} />
        <span className="ml-auto flex items-center gap-1.5">
          Less
          <span className="flex">
            {[0.05, 0.25, 0.45, 0.65, 0.85].map((i) => (
              <span key={i} className="size-3.5 rounded-[3px]" style={{ background: heatColor(i) }} />
            ))}
          </span>
          More
        </span>
      </div>

      <div className="max-h-[640px] overflow-auto border-t">
        <table className="border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 h-48 w-[200px] min-w-[200px] border-b border-r bg-card px-3 text-left align-bottom font-medium text-muted-foreground">
                Customer
              </th>
              {columns.map((name) => (
                <th
                  key={name}
                  className="sticky top-0 z-20 h-48 w-9 min-w-9 border-b bg-card align-bottom"
                >
                  <div className="flex h-full items-end justify-center pb-2">
                    <span
                      className="max-h-44 overflow-hidden whitespace-nowrap text-[11px] leading-none text-foreground/75"
                      style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                      title={name}
                    >
                      {shortFeatureName(name)}
                    </span>
                  </div>
                </th>
              ))}
              <th className="sticky right-0 top-0 z-30 w-28 min-w-28 border-b border-l bg-card px-3 text-right align-bottom font-medium text-muted-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((company) => {
              const total = rowTotals.get(company) ?? 0;
              return (
                <tr key={company} className="group">
                  <th className="sticky left-0 z-10 w-[200px] min-w-[200px] border-b border-r bg-card px-3 py-1.5 text-left font-normal group-hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-[9px] font-semibold text-muted-foreground">
                        {initials(company)}
                      </span>
                      <span className="truncate" title={company}>
                        {company}
                      </span>
                    </div>
                  </th>
                  {columns.map((name) => {
                    const cell = cellMap.get(`${company}||${name}`);
                    const raw = cell ? (metric === "users" ? cell.users : cell.occ) : 0;
                    const intensity =
                      metric === "adopted"
                        ? cell?.adopted
                          ? 0.7
                          : 0
                        : heatIntensity(raw, maxVal);
                    const bg = heatColor(intensity);
                    return (
                      <td key={name} className="border-b border-border/40 p-0 text-center">
                        {cell && (raw > 0 || cell.adopted) ? (
                          <HoverCard openDelay={120} closeDelay={60}>
                            <HoverCardTrigger asChild>
                              <div
                                className="mx-auto flex h-7 w-8 cursor-default items-center justify-center rounded-[3px] text-[9px] font-medium tabular-nums transition-transform hover:scale-110 hover:ring-2 hover:ring-ring/40"
                                style={{ background: bg, color: heatText(intensity) }}
                              >
                                {metric === "adopted"
                                  ? cell.adopted
                                    ? "●"
                                    : ""
                                  : intensity > 0.18
                                    ? compact(raw)
                                    : ""}
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-64" side="top">
                              <div className="flex flex-col gap-1.5">
                                <div className="text-sm font-semibold leading-tight">{company}</div>
                                <div className="text-xs text-muted-foreground">{name}</div>
                                <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                  <span className="text-muted-foreground">Interactions</span>
                                  <span className="text-right font-medium tabular-nums">{fmt(cell.occ)}</span>
                                  <span className="text-muted-foreground">Users</span>
                                  <span className="text-right font-medium tabular-nums">{fmt(cell.users)}</span>
                                  <span className="text-muted-foreground">Avg / user</span>
                                  <span className="text-right font-medium tabular-nums">{cell.avg || "—"}</span>
                                  <span className="text-muted-foreground">Last seen</span>
                                  <span className="text-right">{fmtDate(cell.last)}</span>
                                </div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        ) : (
                          <div className="mx-auto h-7 w-8" />
                        )}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 border-b border-l bg-card px-3 py-1.5 group-hover:bg-muted/50">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${colMax ? (total / colMax) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-medium tabular-nums">{compact(total)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
