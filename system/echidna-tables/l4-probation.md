---
type: BigQuery Table
title: l4_probation
description: Guard L4 state — provider/side combinations currently blocked from trading.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=l4_probation&page=table
lilith_safe: false
status: deprecated
generated: { by: devin/cli, at: 2026-10-06T08:00:00Z }
verified: { by: human:jun, at: 2026-06-19T01:02:48Z }
stale_after: 2026-12-16T01:02:48Z
tags: [echidna, bigquery, guard, l4, probation]
dataset: magi_core
table_type: BASE TABLE
---

> **Deprecated.** 2026-10-06: this table does **not** exist in `magi_core`
> (verified via `bq ls` / `bq show`), and no magi-core code reads or writes
> it (`magi-core @ baa5388`). Guard L4 runs **warn-only** from the
> in-session ISABEL stats cache — there is no persisted probation state.
> Retained as the historical record of the designed (never materialized)
> blocking-L4 state table.

The abandoned design below is retained for history: backing state for Guard
L4 would have been a provider/side combo placed on probation and blocked
until it earns passes back. **None of this runs today** — the table was
never created and L4 evaluates in-session without persistence.

# Schema

| Column | Type | Description |
|---|---|---|
| llm_provider | STRING | Provider key on probation. |
| side | STRING | `buy` / `sell` blocked. |
| blocked_at | TIMESTAMP | When the block started. |
| probation_passes_this_month | INT64 | Passes accrued this month. |
| last_pass_at | TIMESTAMP | Last successful pass. |
| updated_at | TIMESTAMP | Last state change. |

# Joins

* `llm_provider` → [plm-units](/system/plm-units/)

# Citations

* Logic: Guard L4 in `magi-core/src/llm.js`. See [guards/l4](/system/guards/l4.md).
