---
type: BigQuery Table
title: order_fills (proposed)
description: L0 append-only fill-granularity ledger — one row per executed fill increment, so partial fills and multi-exit closes are preserved instead of being collapsed into cumulative order-level quantities.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-09T23:03:00Z }
stale_after: 2027-04-09T23:03:00Z
tags: [echidna, bigquery, distillation, fills, proposed]
dataset: magi_core
table_type: BASE TABLE (proposed — does not exist yet)
---

> **Draft — proposed table, not yet created.** The producer (fill
> recording inside the dispatch/reconciliation path) is a separate
> reviewed change; the DDL lives in `magi-core` (`sql/`) for Jun to apply.

`order_intents` and `trades` record **order-level** outcomes. That loses
fill granularity: a partial fill's incremental qty/price/fee, and a
position closed by several exit orders, are compressed into cumulative
fields. `order_fills` preserves each fill increment so outcome attribution
entry↔exit is computed downstream (FIFO in the evaluator) rather than
assumed at write time.

The lineage spine this table completes:

```
decision_id → intent_id → broker_order_id → fill_id
                                  ↓
            entry_fill ↔ exit_fill P&L allocation (evaluator-side)
```

# Schema (proposed)

| Column | Type | Description |
|---|---|---|
| fill_id | STRING | `f_` + hash(intent_id, broker_order_id, fill_seq) — deterministic so replays dedupe; a broker-native fill id overrides when one exists. |
| broker_order_id | STRING | MooMoo order id this fill belongs to. |
| intent_id | STRING | Order-intent journal key (joins to `order_intents`). |
| decision_id | STRING | Distillation corpus decision key (NULL for non-experiment orders). |
| unit_name | STRING | Owning unit. |
| session_id | STRING | Session that dispatched the order. |
| symbol | STRING | Ticker. |
| side | STRING | `BUY` / `SELL`. |
| fill_seq | INT64 | Sequence of this fill within the order (1-based). |
| fill_qty | NUMERIC | Incremental quantity executed in **this** fill — never a cumulative `filled_qty`. |
| fill_price | NUMERIC | Price of this fill increment. |
| fee_amount | NUMERIC | Fee charged on this increment when reported separately. |
| fee_currency | STRING | e.g. `USD`. |
| remaining_qty | NUMERIC | Order quantity still open after this fill (NULL when unknown). |
| source | STRING | `live_response` / `order_history` / `reconcile` — which broker path reported the fill. |
| filled_at | TIMESTAMP | Broker-reported fill instant. |
| record_version | INT64 | Correction chain; latest version wins (≥1). |
| record_hash | STRING | Content hash for dedupe/conflict detection. |
| experiment_id | STRING | Owning experiment when applicable. |
| ingested_at | TIMESTAMP | BigQuery insert time. |

# Contracts

* **Append-only.** Corrections are new `record_version` rows; a fill is
  never edited in place.
* **Increments, not snapshots.** `fill_qty`/`fill_price` describe only
  this increment; cumulative order state is derived, never stored here.
* **Attribution is downstream.** Entry↔exit pairing and fee allocation
  happen in the evaluator with a versioned rule — this table stores facts,
  not conclusions.
