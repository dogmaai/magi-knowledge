---
type: BigQuery Table
title: position_guard_evals
description: Per-position evaluation ledger — one row per broker-listed position per checkAndClosePositions run, so a position missing from the broker list provably leaves no trace.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=position_guard_evals&page=table
lilith_safe: false
status: draft
generated: { by: claude/cloud, at: 2026-11-25T02:45:00Z }
verified: [{ by: human:jun, at: 2026-10-06T07:23:42Z }]
stale_after: 2027-04-04T07:23:42Z
tags: [echidna, bigquery, position-guard, observability, audit]
dataset: magi_core
table_type: BASE TABLE
---

> Revision note (2026-11-25, claude/cloud — **not human-verified**): the
> `outcome` list gains `SHADOW_NO_ORDER` and `applied_stop_pct` is now
> tighten-only (magi-core#731, `133fd97`; read at `63888b2`). Doc is `draft`
> until Jun re-verifies; the retained `verified` entries cover the earlier
> revision. Deployment of the change is not confirmed by this document.

`position_guard_evals` records every position the exit-enforcement path
evaluated — including positions where no threshold was hit (`outcome='NONE'`)
and deferred closes (`outcome='DEFERRED'`). Written by
`checkAndClosePositions()` in `magi-core/src/positionMgmt.js`, which runs both
inside the `magi-position-guard` Cloud Run job (15-minute cadence,
`trade_mode='POSITION_GUARD'`) and inside PLM sessions (`trade_mode='NORMAL'`).

Introduced by dogmaai/magi-knowledge#99 (R1). The table is created
out-of-band via `magi-core/sql/create_position_guard_evals.sql` and exists
in `magi_core` (schema verified via `bq show` 2026-10-06); if the table is
ever missing the writer degrades to Cloud-Logging-only (no insert
attempted).

# Purpose

Before this ledger, only close decisions and deferrals were logged — a
position absent from `position_list_query` was completely invisible, which is
the failure mode suspected behind the 2026-09 short-position losses that blew
past the short stop (default -3.5% of entry — see
[position-management](../constitution/position-management.md), mutable;
see magi-knowledge#99, P-1). Diffing this table
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
| applied_stop_pct | FLOAT64 | Stop threshold actually applied at evaluation time, in percent. **Tighten-only:** the long stop is `STOP_LOSS_PCT` env **only if it is tighter than −5%** (e.g. −3); unset, non-numeric, non-negative or **wider-than-−5%** values are ignored and the −5% floor applies (the wider value is logged and alerted once per process). Short = long stop × `SHORT_SL_TIGHTEN` (factor in (0, 1], default 0.7 → −3.5%; an out-of-range factor falls back to 0.7) via `getShortStopLossThreshold()` in `magi-core/lib/short-sl-guard.js`, so a short stop is never wider than the long stop. Source: `resolveStopLossPct()` in `magi-core/lib/stop-loss-floor.js`, read at magi-core `63888b2` (`src/positionMgmt.js`). Rows written before magi-core#731 may carry a wider value if `STOP_LOSS_PCT` was set wider. |
| prior_tp_taken | BOOL | Whether a first TAKE_PROFIT scale-out already fired for this entry. |
| close_reason | STRING | `STOP_LOSS` / `TAKE_PROFIT` / `TAKE_PROFIT_HIGH` / `BREAKEVEN_STOP` / NULL. |
| outcome | STRING | `NONE` / `DEFERRED` / `ORDER_FILLED` / `ORDER_PENDING_FILL` / `ORDER_FAILED` / `ERROR` / `SHADOW_NO_ORDER`. `SHADOW_NO_ORDER`: a threshold was hit in a **SHADOW** session (`trade_mode` `SHADOW`, or an unlabelled job whose `TRADE_MODE`/`MODE` is `SHADOW`) — the evaluation is recorded with `skip_reason='shadow_mode'` and **no order is sent**; it is not counted as a failure. The standalone `POSITION_GUARD` is never shadowed. |
| skip_reason | STRING | e.g. `can_sell_qty_0`, `close_qty_lt_1`, or an error message (truncated). |
| order_id | STRING | Close order id when submitted. |
| fill_confirmed | BOOL | Whether the close fill was broker-confirmed in the same run. |
| trade_mode | STRING | `POSITION_GUARD` / `NORMAL` / `SHADOW` / etc. — which caller evaluated. |
| unit_name | STRING | MAGI unit running the session (NULL-ish for the standalone guard). |
| llm_provider | STRING | Provider key of the caller. |
| broker | STRING | `moomoo`. |

# Position-guard failure reporting

The standalone `magi-position-guard` job (`position-guard.mjs`) uses the
result of `checkAndClosePositions()` to fail loudly (magi-core#731, #729
item 5): it exits non-zero and sends an `ALERT` notification instead of
logging `[GUARD] Done`. `ok:false` means the scan itself failed (broker or service-discovery outage,
see [service_endpoints](service-endpoints.md)) and `closeErrors` for
protective closes that were attempted and failed. `SHADOW_NO_ORDER` is not
a close error. Trading sessions still never see a thrown error.

# Intended consumers

* R2 reconciliation (magi-core#527): open-entry symbols in
  [trades](trades.md) vs positions appearing here → alert on missing.
* SL-execution latency analysis: `effective_pnl_pct` crossing below
  `applied_stop_pct` vs first `outcome` transition.

# Citations

* Writer: `persistPositionEvals()` in `magi-core/src/positionMgmt.js`.
* DDL: `magi-core/sql/create_position_guard_evals.sql`.
* Origin analysis: magi-knowledge issue #99 (P-1: stop-loss execution gap).
