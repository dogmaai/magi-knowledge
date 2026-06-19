---
type: BigQuery Table
title: l4_probation
description: Guard L4 state — provider/side combinations currently blocked from trading.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=l4_probation&page=table
lilith_safe: false
tags: [echidna, bigquery, guard, l4, probation]
dataset: magi_core
table_type: BASE TABLE
---

Backing state for [Guard L4](/system/guards/l4.md): a provider/side combo that
has underperformed is placed on probation and blocked until it earns passes
back.

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
