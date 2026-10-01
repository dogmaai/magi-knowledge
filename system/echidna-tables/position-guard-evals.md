---
type: BigQuery Table
title: position_guard_evals
description: Per-position evaluation ledger — one row per broker-listed position per checkAndClosePositions run, so a position missing from the broker list provably leaves no trace.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=position_guard_evals&page=table
lilith_safe: false
status: draft
generated: { by: devin/local, at: 2026-10-01T06:10:00Z }
stale_after: 2026-12-30T06:10:00Z
tags: [echidna, bigquery, position-guard, observability, audit]
dataset: magi_core
table_type: BASE TABLE
---

`position_guard_evals` records every position the exit-enforcement path
evaluated — including positions where no threshold was hit (`outcome='NONE'`)
and deferred closes (`outcome='DEFERRED'`). Written by
`checkAndClosePositions()` in `magi-core/src/positionMgmt.js`, which runs both
inside the `magi-position-guard` Cloud Run job (15-minute cadence,
`trade_mode='POSITION_GUARD'`) and inside PLM sessions (`trade_mode='NORMAL'`).

> **Draft — unverified.** Introduced by dogmaai/magi-knowledge#99 (R1).
> The table is created out-of-band via
> `magi-core/sql/create_position_guard_evals.sql`; until it exists the writer
> degrades to Cloud-Logging-only (no insert attempted).

# Purpose

Before this ledger, only close decisions and deferrals were logged — a
position absent from `position_list_query` was completely invisible, which is
the failure mode suspected behind the 2026-09 short-position losses that blew
past the -3.5% short stop (see magi-knowledge#99, P-1). Diffing this table
against open entries in [trades](trades.md) exposes positions the guard never
evaluated.

# Schema

| Column | Type | Description |
|---|---|---|
| id | STRING | Row UUID (`NOT NULL`). |
| timestamp | TIMESTAMP | Evaluation time (UTC). |
| session_id | STRING | Guard/session UUID for this run. |
| symbol | STRING | Broker-listed position symbol. |
| side | STRING | `long` / `short` (from signed qty). |
| qty | FLOAT64 | Position size. |
| can_sell_qty | FLOAT64 | Currently sellable qty (0 = locked by pending order). |
| avg_cost | FLOAT64 | Broker average cost basis. |
| current_price | FLOAT64 | Broker-reported current price at evaluation. |
| effective_pnl_pct | FLOAT64 | Side-adjusted P&L % used for the decision. |
| applied_stop_pct | FLOAT64 | Stop threshold applied (-5 long / -3.5 short). |
| prior_tp_taken | BOOL | Whether a first TAKE_PROFIT scale-out already fired for this entry. |
| close_reason | STRING | `STOP_LOSS` / `TAKE_PROFIT` / `TAKE_PROFIT_HIGH` / `BREAKEVEN_STOP` / NULL. |
| outcome | STRING | `NONE` / `DEFERRED` / `ORDER_FILLED` / `ORDER_PENDING_FILL` / `ORDER_FAILED` / `ERROR`. |
| skip_reason | STRING | e.g. `can_sell_qty_0`, `close_qty_lt_1`, or an error message (truncated). |
| order_id | STRING | Close order id when submitted. |
| fill_confirmed | BOOL | Whether the close fill was broker-confirmed in the same run. |
| trade_mode | STRING | `POSITION_GUARD` / `NORMAL` / etc. — which caller evaluated. |
| unit_name | STRING | MAGI unit running the session (NULL-ish for the standalone guard). |
| llm_provider | STRING | Provider key of the caller. |
| broker | STRING | `moomoo`. |

# Intended consumers

* R2 reconciliation (magi-core#527): open-entry symbols in
  [trades](trades.md) vs positions appearing here → alert on missing.
* SL-execution latency analysis: `effective_pnl_pct` crossing below
  `applied_stop_pct` vs first `outcome` transition.

# Citations

* Writer: `persistPositionEvals()` in `magi-core/src/positionMgmt.js`.
* DDL: `magi-core/sql/create_position_guard_evals.sql`.
* Origin analysis: magi-knowledge issue #99 (P-1: stop-loss execution gap).
