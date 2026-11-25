---
type: BigQuery Table
title: sessions
description: Per-run session summary — equity, PnL, provider, trade count.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=sessions&page=table
lilith_safe: false
status: draft
generated: { by: claude/cloud, at: 2026-11-25T03:37:03Z }
verified: { by: human:jun, at: 2026-06-19T01:02:48Z }
stale_after: 2026-12-16T01:02:48Z
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
| trade_mode | STRING | The writing job's `TRADE_MODE` — see [trade_mode values](#trade_mode-values). |

# trade_mode values

Full-table read, 2026-11-25 (read-only `SELECT trade_mode, COUNT(*)`;
magi-core `296ef9d`):

| Value | Rows | Range | Notes |
|---|---|---|---|
| `NORMAL` | 11,183 | 2026-01-16 → | Live units. |
| `SHADOW` | 573 | 2026-08-24 → | `TRADE_MODE=SHADOW` units (MELCHIOR-1 today); they never dispatch broker orders. Same values as [thoughts trade_mode](thoughts.md#trade_mode-values). |
| `SCALPING` | 90 | 2026-01-15 → 2026-02-11 | Retired scalping jobs; historical only. |
| `''` (empty) | 1,498 | 2026-01-14 → 2026-01-15 | Pre-`TRADE_MODE` rows; historical only. |

The formerly documented `live` / `paper` / `simulation` occur in no row.
Consumers that count live activity (e.g. [magi-watchdog](/system/services/magi-watchdog.md))
exclude `SHADOW`.

The row is written when a session **ends** (`runEndSession`), and only after
the broker account read succeeds, so a session that crashed or could not
reach the broker leaves no row; its `thoughts` rows still exist.

# Joins

* `session_id` ← [trades](trades.md).session_id, [thoughts](thoughts.md).session_id

# Citations

* Writer: session lifecycle in `magi-core/src/session.js`.
