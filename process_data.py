#!/usr/bin/env python3
"""
Process Userpilot CSV exports into a single rich dashboard-data.json.

Data shape understood from exploration:
  - 59 companies, 145 CSV files.
  - Pattern: <Company>_<Events|Pages>_<iSource|iContract>.csv
  - iSource: Events only (25 companies). All iSource *Pages* files are EMPTY.
  - iContract: Events (47 companies) + Pages (thin: 2 distinct pages).
  - Each file = one company; unique_company_ids is always 1.
  - Date range of activity (last_seen): 2026-03-23 .. 2026-06-17.

Metrics produced:
  - Flat records (company x feature) for the table view.
  - Feature catalog with cross-company adoption.
  - Company profiles with adoption breadth & depth.
  - Product comparison, category breakdown, recency cohorts, rollout timeline.
"""
import csv, glob, json, os, statistics
from collections import defaultdict, Counter
from datetime import date, datetime

SRC = "Userpilot_Exports (3)"
# "today" = latest activity date in the dataset (data is a June 2026 export)
TODAY = date(2026, 6, 18)


def parse_name(fn):
    base = fn[:-4]
    if base.endswith("iSource"):
        product = "iSource"; base = base[:-len("_iSource")]
    elif base.endswith("iContract"):
        product = "iContract"; base = base[:-len("_iContract")]
    else:
        product = "Unknown"
    if base.endswith("_Events"):
        kind = "Event"; company = base[:-len("_Events")]
    elif base.endswith("_Pages"):
        kind = "Page"; company = base[:-len("_Pages")]
    else:
        kind = "Unknown"; company = base
    return company.replace("_", " "), kind, product


def to_int(v):
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return 0


def days_since(iso):
    if not iso:
        return None
    try:
        d = datetime.fromisoformat(iso[:10]).date()
        return (TODAY - d).days
    except ValueError:
        return None


def recency_bucket(days):
    if days is None:
        return "Never"
    if days <= 7:
        return "Last 7 days"
    if days <= 30:
        return "Last 30 days"
    if days <= 90:
        return "Last 90 days"
    return "Older than 90 days"


def functional_area(name):
    """Derive a meaningful functional area from the feature name.

    Userpilot's raw `category` field is unreliable instrumentation metadata
    (a batch of real features is tagged "test", search is split between
    "Search" and "Uncategorized", risk buttons are tagged "Page", and all of
    iSource is blank). The display names, however, are consistently delimited
    (e.g. "iContract | Aspen AVOC | All Approvers", "iSource | Scoresheet | …"),
    so we classify on those instead. Order matters — earliest match wins.
    """
    n = name.lower()
    has = lambda *subs: any(s in n for s in subs)

    if has("search"):
        return "Search"
    if has("scoresheet", "scorer", "score |", "add scorers"):
        return "Scoring"
    if has("amendment"):
        return "Amendments"
    if has("approver", "approve", "reject", "delegate", "workflownav"):
        return "Approvals"
    if has("avoc", "outline", "authoring"):
        return "Authoring (AVOC)"
    if has("template"):
        return "Templates"
    if has("clause"):
        return "Clauses"
    if has(" cd ", "cd extraction", "cd results", "cd open", "cd "):
        return "Clause Discovery"
    if has("risk", " ir", "-ir"):
        return "Risk & Compliance"
    if has("create contract", "upload contract", "dashboard", "dasboard"):
        return "Contract Creation"
    if has("attachment", "eforum"):
        return "Collaboration"
    if has("mbd", "tie"):
        return "Multi-bid (MBD)"
    if has("boq"):
        return "BOQ"
    if has("transform bid"):
        return "Bid Transform"
    if has("rfx", "questgenie", "response_analyzer", "response analyzer", "genie"):
        return "AI Assist"
    if has("createevent", "create_event", "reopenevent", "reopen", "_pause",
            "viewtemplates", "eventsummary", "_fs", "ukprod", "eu_fs", "_qs_"):
        return "Sourcing Events"
    return "Other"


records = []          # flat company x feature rows
files = sorted(glob.glob(os.path.join(SRC, "*.csv")))

for fn in files:
    company, kind, product = parse_name(os.path.basename(fn))
    with open(fn, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        name = (r.get("display_name") or "").strip()
        if not name:
            continue
        is_event = kind == "Event"
        occ = to_int(r.get("total_occurred")) if is_event else to_int(r.get("total_views"))
        users = to_int(r.get("unique_user_ids"))
        avg_user = to_int(r.get("avg_occurrences_per_user")) if is_event else to_int(r.get("avg_views_per_user"))
        last = (r.get("last_seen") or r.get("last_viewed") or "")[:10]
        inserted = (r.get("inserted_at") or "")[:10]
        ds = days_since(last)
        records.append({
            "company": company,
            "product": product,
            "kind": kind,                 # Event | Page
            "name": name,
            "category": functional_area(name),
            "description": (r.get("description") or "").strip(),
            "users": users,
            "occurrences": occ,
            "avgPerUser": avg_user,
            "lastActivity": last or None,
            "insertedAt": inserted or None,
            "owner": (r.get("inserted_by") or "").strip(),
            "daysSince": ds,
            "recency": recency_bucket(ds),
            "adopted": occ > 0,
        })

# ---------- Feature catalog (cross-company) ----------
feat_map = defaultdict(list)
for rec in records:
    feat_map[(rec["product"], rec["kind"], rec["name"])].append(rec)

features = []
for (product, kind, name), recs in feat_map.items():
    occ = sum(r["occurrences"] for r in recs)
    total_users = sum(r["users"] for r in recs)
    adopters = [r for r in recs if r["adopted"]]
    last_dates = [r["lastActivity"] for r in recs if r["lastActivity"]]
    avg_per_user_vals = [r["avgPerUser"] for r in adopters if r["avgPerUser"] > 0]
    features.append({
        "product": product,
        "kind": kind,
        "name": name,
        "category": recs[0]["category"],
        "description": next((r["description"] for r in recs if r["description"]), ""),
        "owner": next((r["owner"] for r in recs if r["owner"]), ""),
        "totalOccurrences": occ,
        "totalUsers": total_users,
        "companiesAvailable": len(recs),
        "companiesAdopted": len(adopters),
        "adoptionRate": round(100 * len(adopters) / len(recs), 1) if recs else 0,
        "avgPerUser": round(statistics.mean(avg_per_user_vals), 1) if avg_per_user_vals else 0,
        "lastActivity": max(last_dates) if last_dates else None,
        "insertedAt": min((r["insertedAt"] for r in recs if r["insertedAt"]), default=None),
        "topCompanies": sorted(
            [{"company": r["company"], "occurrences": r["occurrences"], "users": r["users"]}
             for r in adopters],
            key=lambda x: -x["occurrences"])[:8],
    })
features.sort(key=lambda x: -x["totalOccurrences"])

# ---------- Company profiles ----------
comp_map = defaultdict(list)
for rec in records:
    comp_map[rec["company"]].append(rec)

companies = []
for company, recs in comp_map.items():
    products = sorted({r["product"] for r in recs})
    def prod_stats(p):
        pr = [r for r in recs if r["product"] == p]
        if not pr:
            return None
        adopted = [r for r in pr if r["adopted"]]
        events = [r for r in pr if r["kind"] == "Event"]
        return {
            "occurrences": sum(r["occurrences"] for r in pr),
            "users": max((r["users"] for r in pr), default=0),
            "featuresAvailable": len(pr),
            "featuresAdopted": len(adopted),
            "adoptionRate": round(100 * len(adopted) / len(pr), 1) if pr else 0,
        }
    last_dates = [r["lastActivity"] for r in recs if r["lastActivity"]]
    adopted = [r for r in recs if r["adopted"]]
    last = max(last_dates) if last_dates else None
    companies.append({
        "name": company,
        "products": products,
        "isProspectBoth": len(products) > 1,
        "totalOccurrences": sum(r["occurrences"] for r in recs),
        "activeUsers": max((r["users"] for r in recs), default=0),
        "featuresAvailable": len(recs),
        "featuresAdopted": len(adopted),
        "adoptionRate": round(100 * len(adopted) / len(recs), 1) if recs else 0,
        "lastActivity": last,
        "daysSinceActive": days_since(last),
        "recency": recency_bucket(days_since(last)),
        "iSource": prod_stats("iSource"),
        "iContract": prod_stats("iContract"),
    })
companies.sort(key=lambda x: -x["totalOccurrences"])

# ---------- Summary / KPIs ----------
events = [r for r in records if r["kind"] == "Event"]
pages = [r for r in records if r["kind"] == "Page"]

def product_summary(p):
    pr = [r for r in records if r["product"] == p]
    pe = [r for r in pr if r["kind"] == "Event"]
    comps = sorted({r["company"] for r in pr})
    adopted_comps = sorted({r["company"] for r in pr if r["adopted"]})
    return {
        "product": p,
        "companies": len(comps),
        "activeCompanies": len(adopted_comps),
        "occurrences": sum(r["occurrences"] for r in pr),
        "uniqueFeatures": len({r["name"] for r in pr}),
        "activeUsers": sum(c["iSource"]["users"] if p == "iSource" and c["iSource"] else
                           (c["iContract"]["users"] if p == "iContract" and c["iContract"] else 0)
                           for c in companies),
    }

# recency cohort by company
recency_cohort = Counter(c["recency"] for c in companies)
# rollout timeline: features instrumented per month (inserted_at)
rollout = Counter()
for f in features:
    if f["insertedAt"]:
        rollout[f["insertedAt"][:7]] += 1
# category breakdown by occurrences
cat_occ = Counter()
for r in records:
    cat_occ[r["category"]] += r["occurrences"]

# adoption distribution histogram (companies by adoption-rate band)
def band(rate):
    if rate == 0: return "0%"
    if rate <= 25: return "1-25%"
    if rate <= 50: return "26-50%"
    if rate <= 75: return "51-75%"
    return "76-100%"
adoption_hist = Counter(band(c["adoptionRate"]) for c in companies)

summary = {
    "generatedFor": "iSource & iContract — Userpilot product analytics",
    "dataThrough": "2026-06-17",
    "totals": {
        "companies": len(companies),
        "products": 2,
        "totalOccurrences": sum(r["occurrences"] for r in records),
        "totalEventOccurrences": sum(r["occurrences"] for r in events),
        "totalPageViews": sum(r["occurrences"] for r in pages),
        "uniqueFeatures": len({(r["product"], r["name"]) for r in records}),
        "trackedRows": len(records),
        "companiesBothProducts": sum(1 for c in companies if c["isProspectBoth"]),
        "activeLast30d": sum(1 for c in companies if c["daysSinceActive"] is not None and c["daysSinceActive"] <= 30),
    },
    "byProduct": [product_summary("iSource"), product_summary("iContract")],
    "recencyCohort": dict(recency_cohort),
    "rolloutTimeline": dict(sorted(rollout.items())),
    "categoryByOccurrences": dict(cat_occ.most_common()),
    "adoptionHistogram": dict(adoption_hist),
}

out = {
    "summary": summary,
    "companies": companies,
    "features": features,
    "records": records,
}

os.makedirs("customer-dashboard/public", exist_ok=True)
dest = "customer-dashboard/public/dashboard-data.json"
with open(dest, "w") as f:
    json.dump(out, f, separators=(",", ":"))
print("Wrote", dest)
print("records:", len(records), "| companies:", len(companies), "| features:", len(features))
print("totals:", json.dumps(summary["totals"], indent=0))
print("byProduct:", json.dumps(summary["byProduct"]))
print("recency:", summary["recencyCohort"])
