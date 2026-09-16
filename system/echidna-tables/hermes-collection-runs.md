---
type: BigQuery Table
title: hermes_collection_runs
description: One row per HERMES collection job run — the up/down, success/failure and error-rate signal for the HERMES Grafana dashboard.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=hermes_collection_runs&page=table
lilith_safe: false
status: draft
generated: { by: devin/local, at: 2026-09-16T01:30:00Z }
verified: { by: devin/local, at: 2026-09-16T01:30:00Z }
stale_after: 2027-03-16T01:30:00Z
tags: [echidna, bigquery, hermes, observability, operations]
dataset: magi_core
table_type: BASE TABLE
---

`hermes_collection_runs` is the HERMES collection-job run ledger introduced
for magi-knowledge#51 (magi-core `feat/hermes-collection-runs`). One row is
appended per `magi-hermes-refresh` run so the
[HERMES observability dashboard](/system/services/hermes-observability.md)
can show up/down, per-run success/failure counts and error rate — signals
that [pre_trade_intelligence](pre-trade-intelligence.md) alone cannot
express, because a failed collection produces no row there.

Code merged; table creation is a manual Jun step
(`bq query ... < sql/create_hermes_collection_runs.sql`). Until the table
exists the writer logs a failed insert (non-blocking by design) and the
dashboard panels show "no data".

# Schema

| Column | Type | Description |
|---|---|---|
| run_id | STRING | UUID per collection run. |
| job | STRING | Producer job, e.g. `magi-hermes-refresh`. |
| status | STRING | Run outcome: `ok` \| `degraded` \| `error`. `degraded` mirrors the job rule — `failed >= ceil(attempted/2)` with `attempted > skipped`; `error` is a fatal run failure. |
| attempted | INT64 | Symbols entered in the per-symbol collection loop. |
| skipped | INT64 | Symbols skipped because a fresh row already existed (HERMES_REFRESH_INTERVAL_HOURS). |
| succeeded | INT64 | Symbols for which a new pre_trade_intelligence row was inserted. |
| no_news | INT64 | Symbols where Brave returned zero results — not an error. |
| failed | INT64 | Symbols that errored during Brave fetch, Gemini analysis, or BQ insert. |
| symbols | INT64 | Collection universe size resolved for the run. |
| moomoo_snapshots | INT64 | [moomoo_snapshots](moomoo-snapshots.md) rows saved by the run; null when the phase did not run. |
| duration_sec | FLOAT64 | Wall-clock duration of the run. |
| error_message | STRING | Fatal error text when `status = 'error'`. |
| collected_at | TIMESTAMP | Run finish time (UTC). Partition key. |

Invariant (mirrors `HermesRefreshSummary` in `src/hermes.js`):
`attempted = skipped + succeeded + no_news + failed`.

# Citations

* DDL: `magi-core/sql/create_hermes_collection_runs.sql`.
* Writer: `magi-core/hermes-refresh.js` → `src/hermes.js` `saveCollectionRunToBQ`.
* Consumer: Grafana `magi-hermes-intelligence` dashboard ("Collection Runs"
  section) — see [hermes-observability](/system/services/hermes-observability.md).
