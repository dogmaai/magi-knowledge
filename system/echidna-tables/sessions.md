---
type: BigQuery Table
title: sessions
description: Per-run session summary — equity, PnL, provider, trade count.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=sessions&page=table
lilith_safe: false
tags: [echidna, bigquery, sessions]
dataset: magi_core
table_type: BASE TABLE
---

One row per trading session. `session_id` is the join key for
[trades](trades.md) and [thoughts](thoughts.md).

# Schema

| Column | Type | Description |
|---|---|---|
| session_id | STRING | PK. |
| started_at | TIMESTAMP | Session start. |
| ended_at | TIMESTAMP | Session end. |
| llm_provider | STRING | Provider key for the session. |
| llm_model | STRING | Model id used. |
| total_trades | INT64 | Trades executed in session. |
| starting_equity | FLOAT64 | Equity at start ($). |
| ending_equity | FLOAT64 | Equity at end ($). |
| pnl | FLOAT64 | Session PnL ($). |
| pnl_percent | FLOAT64 | Session PnL (%). |
| trade_mode | STRING | `live` / `paper` / `simulation`. |

# Joins

* `session_id` ← [trades](trades.md).session_id, [thoughts](thoughts.md).session_id

# Citations

* Writer: session lifecycle in `magi-core/src/session.js`.
