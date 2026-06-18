"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DEFAULT_FILTERS, RECENCY_ORDER, type Filters } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function FilterBar({
  filters,
  setFilters,
  categories,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  categories: string[];
}) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters({ ...filters, [k]: v });

  const dirty =
    filters.product !== "all" ||
    filters.kind !== "all" ||
    filters.category !== "all" ||
    filters.recency !== "all" ||
    filters.adoptedOnly ||
    filters.search.trim() !== "";

  return (
    <div className="no-scrollbar flex items-center gap-2 overflow-x-auto rounded-lg border bg-card p-1.5">
      <div className="relative w-52 shrink-0 sm:w-60">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search customer or feature…"
          className="h-8 w-full border-0 bg-muted/50 pl-8 text-xs shadow-none focus-visible:bg-background"
        />
      </div>

      <Separator orientation="vertical" className="h-6 shrink-0" />

      <ToggleGroup
        type="single"
        value={filters.product}
        onValueChange={(v) => v && set("product", v as Filters["product"])}
        variant="outline"
        className="h-8 shrink-0"
      >
        <ToggleGroupItem value="all" className="px-2.5 text-xs">
          All
        </ToggleGroupItem>
        <ToggleGroupItem value="iSource" className="px-2.5 text-xs data-[state=on]:text-isource">
          iSource
        </ToggleGroupItem>
        <ToggleGroupItem value="iContract" className="px-2.5 text-xs data-[state=on]:text-icontract">
          iContract
        </ToggleGroupItem>
      </ToggleGroup>

      <Select value={filters.kind} onValueChange={(v) => set("kind", v as Filters["kind"])}>
        <SelectTrigger className="h-8 w-[108px] shrink-0 text-xs" size="sm">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="Event">Events</SelectItem>
            <SelectItem value="Page">Pages</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select value={filters.category} onValueChange={(v) => set("category", v)}>
        <SelectTrigger className="h-8 w-[136px] shrink-0 text-xs" size="sm">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select value={filters.recency} onValueChange={(v) => set("recency", v as Filters["recency"])}>
        <SelectTrigger className="h-8 w-[136px] shrink-0 text-xs" size="sm">
          <SelectValue placeholder="Recency" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">Any recency</SelectItem>
            {RECENCY_ORDER.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant={filters.adoptedOnly ? "default" : "outline"}
        size="sm"
        className="h-8 shrink-0 text-xs"
        onClick={() => set("adoptedOnly", !filters.adoptedOnly)}
      >
        Adopted only
      </Button>

      {dirty && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("ml-auto h-8 shrink-0 text-xs text-muted-foreground")}
          onClick={() => setFilters(DEFAULT_FILTERS)}
        >
          <X data-icon="inline-start" />
          Reset
        </Button>
      )}
    </div>
  );
}
