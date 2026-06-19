// Validates lib/aggregate.ts against the committed dashboard-data.json by
// rebuilding from the original CSVs. Run: npx tsx scripts/validate-aggregate.mts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildDataset, type RawRow } from "../lib/aggregate.ts";
import type { Product } from "../lib/types.ts";

const SRC = "../../Userpilot_Exports (3)";

function parseName(fn: string): { company: string; kind: "Event" | "Page"; product: Product } {
  let base = fn.slice(0, -4);
  let product: Product = "iContract";
  if (base.endsWith("iSource")) { product = "iSource"; base = base.slice(0, -"_iSource".length); }
  else if (base.endsWith("iContract")) { product = "iContract"; base = base.slice(0, -"_iContract".length); }
  let kind: "Event" | "Page" = "Event";
  if (base.endsWith("_Events")) { kind = "Event"; base = base.slice(0, -"_Events".length); }
  else if (base.endsWith("_Pages")) { kind = "Page"; base = base.slice(0, -"_Pages".length); }
  return { company: base.replace(/_/g, " "), kind, product };
}

// minimal CSV parser handling quoted fields
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "", row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift()!.map((h) => h.replace(/^﻿/, ""));
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const dir = join(import.meta.dirname, SRC);
const rawRows: RawRow[] = [];
for (const fn of readdirSync(dir).filter((f) => f.endsWith(".csv"))) {
  const { company, kind, product } = parseName(fn);
  const text = readFileSync(join(dir, fn), "utf8");
  for (const r of parseCsv(text)) {
    rawRows.push({ company, product, kind, ...r } as unknown as RawRow);
  }
}

const built = buildDataset(rawRows, new Date("2026-06-18"));
const committed = JSON.parse(
  readFileSync(join(import.meta.dirname, "../public/dashboard-data.json"), "utf8"),
);

const keys = ["companies", "totalOccurrences", "totalEventOccurrences", "totalPageViews", "uniqueFeatures", "trackedRows", "companiesBothProducts", "activeLast30d"] as const;
console.log("metric              built      committed   match");
let allMatch = true;
for (const k of keys) {
  const a = (built.summary.totals as Record<string, number>)[k];
  const b = (committed.summary.totals as Record<string, number>)[k];
  const m = a === b;
  if (!m) allMatch = false;
  console.log(k.padEnd(20), String(a).padStart(8), String(b).padStart(10), "  ", m ? "✓" : "✗");
}
console.log("\ncategoryByOccurrences (built):", JSON.stringify(built.summary.categoryByOccurrences));
console.log("\nfeatures:", built.features.length, "| companies:", built.companies.length);
console.log(allMatch ? "\nALL TOTALS MATCH ✓" : "\nMISMATCH ✗");
process.exit(allMatch ? 0 : 1);
