import type { DashboardData } from "./types";
import { withSegments } from "./segments";

export type InsightTone = "good" | "warn" | "info" | "risk";

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
}

const pctOf = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/**
 * Derive headline insights from the live dataset. Deterministic and data-driven
 * so they update with every sync — an automated "what stands out" read.
 */
export function generateInsights(data: DashboardData): Insight[] {
  const { companies, features, summary } = data;
  const total = summary.totals.totalOccurrences || 1;
  const out: Insight[] = [];

  // 1) Search dominance — the big skew to flag
  const searchOcc = features
    .filter((f) => f.category === "Search")
    .reduce((a, f) => a + f.totalOccurrences, 0);
  const searchShare = pctOf(searchOcc, total);
  if (searchShare >= 40) {
    out.push({
      id: "search-skew",
      tone: "warn",
      title: `Search drives ${searchShare}% of all activity`,
      detail:
        "Two list-search events dominate the totals. Filter Search out (or view by category) to read true feature adoption underneath the volume.",
    });
  }

  // 2) Revenue/usage concentration
  const sorted = [...companies].sort((a, b) => b.totalOccurrences - a.totalOccurrences);
  const top = sorted[0];
  const top5 = sorted.slice(0, 5).reduce((a, c) => a + c.totalOccurrences, 0);
  if (top) {
    out.push({
      id: "concentration",
      tone: "info",
      title: `Top 5 customers = ${pctOf(top5, total)}% of usage`,
      detail: `${top.name} alone accounts for ${pctOf(top.totalOccurrences, total)}%. Engagement is concentrated in a handful of accounts — the long tail is light.`,
    });
  }

  // 3) Segments — champions vs at-risk
  const seg = withSegments(companies);
  const champions = seg.filter((c) => c.segment === "champion").length;
  const risk = seg.filter((c) => c.segment === "at-risk" || c.segment === "dormant").length;
  out.push({
    id: "segments",
    tone: champions >= risk ? "good" : "warn",
    title: `${champions} champions, ${risk} at-risk or dormant`,
    detail:
      champions >= risk
        ? "More broad-and-active accounts than disengaged ones, but the at-risk group is worth a retention nudge before renewal."
        : "Disengaged accounts outnumber champions — prioritise re-activation of the at-risk/dormant cohort.",
  });

  // 4) Product split
  const ic = summary.byProduct.find((p) => p.product === "iContract");
  const is = summary.byProduct.find((p) => p.product === "iSource");
  if (ic && is) {
    out.push({
      id: "product-split",
      tone: "info",
      title: `iContract ${pctOf(ic.occurrences, total)}% vs iSource ${pctOf(is.occurrences, total)}% of activity`,
      detail: `iContract spans ${ic.companies} customers and iSource ${is.companies}. iSource usage is lighter and more concentrated in sourcing-event and scoresheet workflows.`,
    });
  }

  // 5) Feature adoption breadth
  const dormant = features.filter((f) => f.totalOccurrences === 0).length;
  const broad = features.filter((f) => f.companiesAvailable >= 5 && f.adoptionRate >= 50).length;
  out.push({
    id: "feature-reach",
    tone: dormant > broad ? "warn" : "good",
    title: `${dormant} features never triggered · ${broad} broadly adopted`,
    detail: `Of ${summary.totals.uniqueFeatures} tracked features, ${dormant} have zero activity (rollout or discoverability gaps), while only ${broad} reach the majority of customers that have access.`,
  });

  // 6) Recency
  const active30 = summary.totals.activeLast30d;
  out.push({
    id: "recency",
    tone: pctOf(active30, companies.length) >= 80 ? "good" : "warn",
    title: `${active30} of ${companies.length} customers active in last 30 days`,
    detail: `${pctOf(active30, companies.length)}% of accounts touched the products recently — the rest haven't and may need outreach.`,
  });

  return out;
}
