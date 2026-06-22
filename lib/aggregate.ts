// TS port of process_data.py — turns raw Userpilot breakdown rows into the
// dashboard dataset (summary + companies + features + records). Kept in sync
// with process_data.py; validated against public/dashboard-data.json.
import type {
  Company,
  DashboardData,
  Datum,
  Feature,
  Product,
  ProductStats,
  Recency,
} from "./types";

/** One raw row as returned by /events/breakdown or /tagged_pages/breakdown. */
export interface RawRow {
  company: string;
  product: Product;
  kind: "Event" | "Page";
  display_name?: string;
  status?: string;
  unique_user_ids?: number | string;
  total_occurred?: number | string;
  total_views?: number | string;
  avg_occurrences_per_user?: number | string;
  avg_views_per_user?: number | string;
  category?: string;
  last_seen?: string;
  last_viewed?: string;
  inserted_at?: string;
  inserted_by?: string;
  description?: string;
}

const toInt = (v: unknown): number => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : 0;
};

function daysSince(iso: string | null, today: Date): number | null {
  if (!iso) return null;
  const d = new Date(iso.slice(0, 10));
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((today.getTime() - d.getTime()) / 86_400_000);
}

function recencyBucket(days: number | null): Recency {
  if (days === null) return "Never";
  if (days <= 7) return "Last 7 days";
  if (days <= 30) return "Last 30 days";
  if (days <= 90) return "Last 90 days";
  return "Older than 90 days";
}

/** Derive a meaningful functional area from a feature's display name. */
export function functionalArea(name: string): string {
  const n = name.toLowerCase();
  const has = (...subs: string[]) => subs.some((s) => n.includes(s));
  if (has("search")) return "Search";
  if (has("scoresheet", "scorer", "score |", "add scorers")) return "Scoring";
  if (has("amendment")) return "Amendments";
  if (has("approver", "approve", "reject", "delegate", "workflownav")) return "Approvals";
  if (has("avoc", "outline", "authoring")) return "Authoring (AVOC)";
  if (has("template")) return "Templates";
  if (has("clause")) return "Clauses";
  if (has(" cd ", "cd extraction", "cd results", "cd open")) return "Clause Discovery";
  if (has("risk", " ir", "-ir")) return "Risk & Compliance";
  if (has("create contract", "upload contract", "dashboard", "dasboard")) return "Contract Creation";
  if (has("attachment", "eforum")) return "Collaboration";
  if (has("mbd", "tie")) return "Multi-bid (MBD)";
  if (has("boq")) return "BOQ";
  if (has("transform bid")) return "Bid Transform";
  if (has("rfx", "questgenie", "response_analyzer", "response analyzer", "genie")) return "AI Assist";
  if (
    has("createevent", "create_event", "reopenevent", "reopen", "_pause", "viewtemplates",
      "eventsummary", "_fs", "ukprod", "eu_fs", "_qs_")
  )
    return "Sourcing Events";
  return "Other";
}

function mean(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
const round1 = (n: number) => Math.round(n * 10) / 10;
function maxDate(dates: (string | null)[]): string | null {
  const v = dates.filter(Boolean) as string[];
  return v.length ? v.reduce((a, b) => (a > b ? a : b)) : null;
}

export function buildDataset(rows: RawRow[], today = new Date()): DashboardData {
  const records: Datum[] = [];
  for (const r of rows) {
    const name = (r.display_name || "").trim();
    if (!name) continue;
    const isEvent = r.kind === "Event";
    const occ = isEvent ? toInt(r.total_occurred) : toInt(r.total_views);
    const users = toInt(r.unique_user_ids);
    const avgUser = isEvent ? toInt(r.avg_occurrences_per_user) : toInt(r.avg_views_per_user);
    const last = (r.last_seen || r.last_viewed || "").slice(0, 10) || null;
    const inserted = (r.inserted_at || "").slice(0, 10) || null;
    const ds = daysSince(last, today);
    records.push({
      company: r.company,
      product: r.product,
      kind: r.kind,
      name,
      category: functionalArea(name),
      description: (r.description || "").trim(),
      users,
      occurrences: occ,
      avgPerUser: avgUser,
      lastActivity: last,
      insertedAt: inserted,
      owner: (r.inserted_by || "").trim(),
      daysSince: ds,
      recency: recencyBucket(ds),
      adopted: occ > 0,
    });
  }

  // ---- Features ----
  const featMap = new Map<string, Datum[]>();
  for (const rec of records) {
    const k = `${rec.product}|${rec.kind}|${rec.name}`;
    (featMap.get(k) ?? featMap.set(k, []).get(k)!).push(rec);
  }
  const features: Feature[] = [];
  for (const recs of featMap.values()) {
    const occ = recs.reduce((a, r) => a + r.occurrences, 0);
    const adopters = recs.filter((r) => r.adopted);
    const avgVals = adopters.filter((r) => r.avgPerUser > 0).map((r) => r.avgPerUser);
    // count distinct companies (a few events are double-tracked in Userpilot)
    const availCos = new Set(recs.map((r) => r.company)).size;
    const adoptedCos = new Set(adopters.map((r) => r.company)).size;
    features.push({
      product: recs[0].product,
      kind: recs[0].kind,
      name: recs[0].name,
      category: recs[0].category,
      description: recs.find((r) => r.description)?.description ?? "",
      owner: recs.find((r) => r.owner)?.owner ?? "",
      totalOccurrences: occ,
      totalUsers: recs.reduce((a, r) => a + r.users, 0),
      companiesAvailable: availCos,
      companiesAdopted: adoptedCos,
      adoptionRate: availCos ? round1((100 * adoptedCos) / availCos) : 0,
      avgPerUser: round1(mean(avgVals)),
      lastActivity: maxDate(recs.map((r) => r.lastActivity)),
      insertedAt: recs.map((r) => r.insertedAt).filter(Boolean).sort()[0] ?? null,
      topCompanies: adopters
        .map((r) => ({ company: r.company, occurrences: r.occurrences, users: r.users }))
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 8),
    });
  }
  features.sort((a, b) => b.totalOccurrences - a.totalOccurrences);

  // ---- Companies ----
  const compMap = new Map<string, Datum[]>();
  for (const rec of records) {
    (compMap.get(rec.company) ?? compMap.set(rec.company, []).get(rec.company)!).push(rec);
  }
  const companies: Company[] = [];
  for (const [name, recs] of compMap) {
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
    companies.push({
      name,
      products,
      isProspectBoth: products.length > 1,
      totalOccurrences: recs.reduce((a, r) => a + r.occurrences, 0),
      activeUsers: Math.max(0, ...recs.map((r) => r.users)),
      featuresAvailable: recs.length,
      featuresAdopted: adopted.length,
      adoptionRate: recs.length ? round1((100 * adopted.length) / recs.length) : 0,
      lastActivity: last,
      daysSinceActive: daysSince(last, today),
      recency: recencyBucket(daysSince(last, today)),
      iSource: prodStats("iSource"),
      iContract: prodStats("iContract"),
    });
  }
  companies.sort((a, b) => b.totalOccurrences - a.totalOccurrences);

  // ---- Summary ----
  const events = records.filter((r) => r.kind === "Event");
  const pages = records.filter((r) => r.kind === "Page");
  const sumBy = (xs: Datum[]) => xs.reduce((a, r) => a + r.occurrences, 0);
  const productSummary = (p: Product) => {
    const pr = records.filter((r) => r.product === p);
    const comps = new Set(pr.map((r) => r.company));
    const activeComps = new Set(pr.filter((r) => r.adopted).map((r) => r.company));
    return {
      product: p,
      companies: comps.size,
      activeCompanies: activeComps.size,
      occurrences: sumBy(pr),
      uniqueFeatures: new Set(pr.map((r) => r.name)).size,
      activeUsers: companies.reduce(
        (a, c) => a + ((p === "iSource" ? c.iSource?.users : c.iContract?.users) ?? 0),
        0,
      ),
    };
  };
  const tally = (key: (r: Datum) => string, val: (r: Datum) => number) => {
    const o: Record<string, number> = {};
    for (const r of records) o[key(r)] = (o[key(r)] ?? 0) + val(r);
    return o;
  };
  const recencyCohort: Record<string, number> = {};
  for (const c of companies) recencyCohort[c.recency] = (recencyCohort[c.recency] ?? 0) + 1;
  const rollout: Record<string, number> = {};
  for (const f of features) if (f.insertedAt) {
    const m = f.insertedAt.slice(0, 7);
    rollout[m] = (rollout[m] ?? 0) + 1;
  }
  const band = (rate: number) =>
    rate === 0 ? "0%" : rate <= 25 ? "1-25%" : rate <= 50 ? "26-50%" : rate <= 75 ? "51-75%" : "76-100%";
  const adoptionHist: Record<string, number> = {};
  for (const c of companies) adoptionHist[band(c.adoptionRate)] = (adoptionHist[band(c.adoptionRate)] ?? 0) + 1;

  const dataThrough = maxDate(records.map((r) => r.lastActivity)) ?? today.toISOString().slice(0, 10);

  return {
    summary: {
      generatedFor: "iSource & iContract — Userpilot product analytics",
      dataThrough,
      totals: {
        companies: companies.length,
        products: 2,
        totalOccurrences: sumBy(records),
        totalEventOccurrences: sumBy(events),
        totalPageViews: sumBy(pages),
        uniqueFeatures: new Set(records.map((r) => `${r.product}|${r.name}`)).size,
        trackedRows: records.length,
        companiesBothProducts: companies.filter((c) => c.isProspectBoth).length,
        activeLast30d: companies.filter((c) => c.daysSinceActive !== null && c.daysSinceActive <= 30).length,
      },
      byProduct: [productSummary("iSource"), productSummary("iContract")],
      recencyCohort,
      rolloutTimeline: Object.fromEntries(Object.entries(rollout).sort()),
      categoryByOccurrences: Object.fromEntries(
        Object.entries(tally((r) => r.category, (r) => r.occurrences)).sort((a, b) => b[1] - a[1]),
      ),
      adoptionHistogram: adoptionHist,
    },
    companies,
    features,
    records,
  };
}
