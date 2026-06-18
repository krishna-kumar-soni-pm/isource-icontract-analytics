# iSource & iContract — Customer Analytics

A product-analytics dashboard for Zycus' **iSource** (sourcing) and **iContract**
(contract management) products, built from Userpilot event & page exports.

It covers customer-wise, feature-wise and event-wise adoption with KPIs,
customer segmentation, an adoption funnel, a company × feature heat-map matrix,
and fully sortable/filterable tables.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (light mode)
- **Recharts** for charts

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build

```bash
npm run build
npm start
```

## Data pipeline

The dashboard reads a single pre-computed file: `public/dashboard-data.json`.
It is generated from the raw Userpilot CSV exports by `process_data.py` (kept one
level up from this app), which:

- parses every `*_Events_*` / `*_Pages_*` CSV (one file per customer × product),
- derives a clean **functional area** per feature from its name (Userpilot's raw
  `category` field is unreliable instrumentation metadata),
- aggregates company, feature, product, recency and rollout metrics,
- and writes `customer-dashboard/public/dashboard-data.json`.

To regenerate after updating the CSVs:

```bash
python3 ../process_data.py
```

## Deployment (Vercel)

This is a zero-config Next.js app — import the repository in Vercel and it builds
automatically (Framework preset: **Next.js**, no root-directory override needed).

## Notes on the data

- iSource has **events only** — Userpilot did not track iSource pages (all
  `*_Pages_iSource` exports are empty).
- Two list-search events account for ~93% of all interactions; use the product /
  category filters to inspect true feature adoption beneath that.
