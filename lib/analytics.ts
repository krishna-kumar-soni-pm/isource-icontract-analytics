import type {
  Company,
  Datum,
  Feature,
  Product,
  ProductStats,
  Recency,
} from "./types";

export const RECENCY_ORDER: Recency[] = [
  "Last 7 days",
  "Last 30 days",
  "Last 90 days",
  "Older than 90 days",
  "Never",
];

export const PRODUCTS: Product[] = ["iSource", "iContract"];

export interface Filters {
  product: "all" | Product;
  kind: "all" | "Event" | "Page";
  category: string; // "all" or a category name
  recency: "all" | Recency;
  search: string;
  adoptedOnly: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  product: "all",
  kind: "all",
  category: "all",
  recency: "all",
  search: "",
  adoptedOnly: false,
};

export function applyFilters(records: Datum[], f: Filters): Datum[] {
  const q = f.search.trim().toLowerCase();
  return records.filter((r) => {
    if (f.product !== "all" && r.product !== f.product) return false;
    if (f.kind !== "all" && r.kind !== f.kind) return false;
    if (f.category !== "all" && r.category !== f.category) return false;
    if (f.recency !== "all" && r.recency !== f.recency) return false;
    if (f.adoptedOnly && !r.adopted) return false;
    if (q && !(r.company.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)))
      return false;
    return true;
  });
}

function mean(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function maxDate(dates: (string | null)[]): string | null {
  const valid = dates.filter(Boolean) as string[];
  if (!valid.length) return null;
  return valid.reduce((a, b) => (a > b ? a : b));
}

const DATA_TODAY = new Date("2026-06-18");

function recencyOf(last: string | null): Recency {
  if (!last) return "Never";
  const d = Math.round(
    (DATA_TODAY.getTime() - new Date(last).getTime()) / 86_400_000,
  );
  if (d <= 7) return "Last 7 days";
  if (d <= 30) return "Last 30 days";
  if (d <= 90) return "Last 90 days";
  return "Older than 90 days";
}

function daysSince(last: string | null): number | null {
  if (!last) return null;
  return Math.round((DATA_TODAY.getTime() - new Date(last).getTime()) / 86_400_000);
}

/** Re-aggregate company profiles from a (filtered) record set. */
export function aggregateCompanies(records: Datum[]): Company[] {
  const byCompany = new Map<string, Datum[]>();
  for (const r of records) {
    const arr = byCompany.get(r.company) ?? [];
    arr.push(r);
    byCompany.set(r.company, arr);
  }
  const out: Company[] = [];
  for (const [name, recs] of byCompany) {
    const products = [...new Set(recs.map((r) => r.product))].sort() as Product[];
    const adopted = recs.filter((r) => r.adopted);
    const last = maxDate(recs.map((r) => r.lastActivity));

    const prodStats = (p: Product): ProductStats | null => {
      const pr = recs.filter((r) => r.product === p);
      if (!pr.length) return null;
      const ad = pr.filter((r) => r.adopted);
      return {
        occurrences: pr.reduce((a, r) => a + r.occurrences, 0),
        users: Math.max(0, ...pr.map((r) => r.users)),
        featuresAvailable: pr.length,
        featuresAdopted: ad.length,
        adoptionRate: pr.length ? round1((100 * ad.length) / pr.length) : 0,
      };
    };

    out.push({
      name,
      products,
      isProspectBoth: products.length > 1,
      totalOccurrences: recs.reduce((a, r) => a + r.occurrences, 0),
      activeUsers: Math.max(0, ...recs.map((r) => r.users)),
      featuresAvailable: recs.length,
      featuresAdopted: adopted.length,
      adoptionRate: recs.length ? round1((100 * adopted.length) / recs.length) : 0,
      lastActivity: last,
      daysSinceActive: daysSince(last),
      recency: recencyOf(last),
      iSource: prodStats("iSource"),
      iContract: prodStats("iContract"),
    });
  }
  return out.sort((a, b) => b.totalOccurrences - a.totalOccurrences);
}

/** Re-aggregate feature catalog from a (filtered) record set. */
export function aggregateFeatures(records: Datum[]): Feature[] {
  const byFeature = new Map<string, Datum[]>();
  for (const r of records) {
    const key = `${r.product}|${r.kind}|${r.name}`;
    const arr = byFeature.get(key) ?? [];
    arr.push(r);
    byFeature.set(key, arr);
  }
  const out: Feature[] = [];
  for (const recs of byFeature.values()) {
    const first = recs[0];
    const adopters = recs.filter((r) => r.adopted);
    out.push({
      product: first.product,
      kind: first.kind,
      name: first.name,
      category: first.category,
      description: recs.find((r) => r.description)?.description ?? "",
      owner: recs.find((r) => r.owner)?.owner ?? "",
      totalOccurrences: recs.reduce((a, r) => a + r.occurrences, 0),
      totalUsers: recs.reduce((a, r) => a + r.users, 0),
      companiesAvailable: recs.length,
      companiesAdopted: adopters.length,
      adoptionRate: recs.length ? round1((100 * adopters.length) / recs.length) : 0,
      avgPerUser: round1(mean(adopters.filter((r) => r.avgPerUser > 0).map((r) => r.avgPerUser))),
      lastActivity: maxDate(recs.map((r) => r.lastActivity)),
      insertedAt: recs.map((r) => r.insertedAt).filter(Boolean).sort()[0] ?? null,
      topCompanies: adopters
        .map((r) => ({ company: r.company, occurrences: r.occurrences, users: r.users }))
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 8),
    });
  }
  return out.sort((a, b) => b.totalOccurrences - a.totalOccurrences);
}

export interface Kpis {
  companies: number;
  occurrences: number;
  activeUsers: number;
  features: number;
  adoptionRate: number;
  activeLast30d: number;
}

export function computeKpis(records: Datum[], companies: Company[]): Kpis {
  const adopted = records.filter((r) => r.adopted).length;
  return {
    companies: companies.length,
    occurrences: records.reduce((a, r) => a + r.occurrences, 0),
    activeUsers: companies.reduce((a, c) => a + c.activeUsers, 0),
    features: new Set(records.map((r) => `${r.product}|${r.name}`)).size,
    adoptionRate: records.length ? round1((100 * adopted) / records.length) : 0,
    activeLast30d: companies.filter(
      (c) => c.daysSinceActive !== null && c.daysSinceActive <= 30,
    ).length,
  };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function countBy<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) {
    const k = key(it);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export function sumBy<T>(items: T[], key: (t: T) => string, val: (t: T) => number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) {
    const k = key(it);
    out[k] = (out[k] ?? 0) + val(it);
  }
  return out;
}

export function adoptionBand(rate: number): string {
  if (rate === 0) return "0% — Dormant";
  if (rate <= 25) return "1–25% — Low";
  if (rate <= 50) return "26–50% — Moderate";
  if (rate <= 75) return "51–75% — High";
  return "76–100% — Power user";
}
