---
type: Dashboard
title: HERMES observability (Grafana)
description: The magi-hermes-intelligence Grafana Cloud dashboard — what it shows, where the data comes from, and how it is provisioned and verified.
lilith_safe: false
status: draft
generated: { by: devin/local, at: 2026-09-16T01:30:00Z }
verified: { by: devin/local, at: 2026-09-16T01:30:00Z }
stale_after: 2027-03-16T01:30:00Z
tags: [grafana, observability, hermes, dashboard, operations]
repo: dogmaai/magi-core
---

Operational view of the [magi-core](magi-core.md) HERMES intelligence
stack for magi-knowledge#51. Read this together with the table docs it
queries: [pre_trade_intelligence](/system/echidna-tables/pre-trade-intelligence.md),
[market_research](/system/echidna-tables/market-research.md),
[moomoo_snapshots](/system/echidna-tables/moomoo-snapshots.md),
[focus_symbols](/system/echidna-tables/focus-symbols.md) and
[hermes_collection_runs](/system/echidna-tables/hermes-collection-runs.md).

# Dashboard

* Grafana Cloud: `https://aka.grafana.net`, dashboard uid
  `magi-hermes-intelligence` ("MAGI HERMES Intelligence"), tags `magi`,
  `hermes`, timezone `Asia/Tokyo`, refresh `1m`.
* Source of truth: `magi-core/grafana/hermes-intelligence.json`.
* Datasource: `grafana-bigquery-datasource` uid `bflevhqrd7xtsb` →
  `screen-share-459802.magi_core`, location `US`. Every BigQuery target and
  the `$symbol` template variable must carry `location: 'US'` — enforced by
  `grafana/verify-hermes-dashboard.mjs` and by
  `lib/__tests__/hermes-collection-runs.test.js`.

# Provisioning & verification

Two paths, both reproducible:

1. **Git Sync** — the Grafana provisioning repository watches
   `dogmaai/magi-core`; merging the JSON to `main` syncs the dashboard
   automatically. `grafana/verify-hermes-dashboard.mjs` waits for Git Sync
   (`status.sync.lastRef` must reach or descend from the pushed SHA), then
   executes every panel query via `/api/ds/query`. Runs in CI
   (`.github/workflows/provision-hermes-grafana.yml`) on push to `main`.
2. **Manual upsert** — `DRY_RUN=1 node grafana/provision.mjs` to preview;
   `GRAFANA_SA_TOKEN=… node grafana/provision.mjs` to push. The token lives
   in GCP Secret Manager (`GRAFANA_SA_TOKEN`), see
   [secrets-inventory](secrets-inventory.md).

# Panels and how to read them

**HERMES Health & Freshness** — age-in-minutes stats for the three live
outputs (`pre_trade_intelligence`, `market_research`,
`moomoo_snapshots`) plus the latest focus-universe coverage
(`focus_symbols` vs collected rows). Freshness thresholds yellow 70m /
red 130m match the hourly `magi-hermes-refresh` cadence
(`0 13-21 * * 1-5` UTC); market_research uses the 15-minute
`magi-sentiment-monitor` cadence (yellow 20m / red 40m).

**Collection Runs** (`hermes_collection_runs`, added for #51) — the
explicit up/down and failure surface: last-run age, last run `status`
(`ok` green / `degraded` yellow / `error` red), failed symbols today,
error rate today (`failed / (attempted - skipped)`, matching the job's own
degraded rule), outcomes-per-run timeseries and a recent-runs table.
`no_news` (Brave returned nothing) is deliberately not counted as an
error. **No rows at all = the job is not running.**

**Collection Volume / Sentiment Intelligence / Broker Reality /
Cost & Quality** — rows collected per hour per output table, latest
per-symbol sentiment, sentiment history for `$symbol`, research
distribution and latest macro report, latest broker snapshots + bid-ask
spread for `$symbol`, and daily research cost / duration / query volume /
status values.

# Reading failures

| Symptom | Meaning |
|---|---|
| Last-run age red / no rows | `magi-hermes-refresh` not running or crashing before the run row write (a fatal error writes `status='error'`; a crash before that leaves no row). |
| `status=error` row | Fatal job failure — see `error_message`. |
| `status=degraded` | `failed >= ceil(attempted/2)` on active (non-skipped) attempts — same rule as the job's Telegram alert. |
| Freshness stat red without failed runs | Collection succeeded but upstream data is stale (e.g. snapshot phase empty) or the panel table is not being written. |
| Coverage < 100% | Focus-universe symbols missing fresh `pre_trade_intelligence` rows — correlate with `no_news`/`failed`. |

# Boundary notes

* This dashboard is read-only observability. It does not touch trade
  guards, order execution, trading modes or risk configuration, and it
  reads no `_lilith_safe/` data — the tables it queries are `system/`
  operational tables.
* `[HERMES:X_SEARCH]` (xAI) is not in use (cost decision, see
  [magi-core](magi-core.md)) — no panels cover it.
