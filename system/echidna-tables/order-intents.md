---
type: BigQuery Table
title: order_intents
description: Append-only order-intent journal; every magi-core order is journaled before the broker POST and reconciled against broker order_history via the intent id embedded in the broker remark.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=order_intents&page=table
lilith_safe: false
status: draft
generated: { by: devin/local, at: 2026-09-13T00:00:00Z }
verified: { by: devin/local, at: 2026-09-13T00:00:00Z }
stale_after: 2027-03-13T00:00:00Z
tags: [echidna, bigquery, orders, reliability, reconciliation]
dataset: magi_core
table_type: BASE TABLE
---

`order_intents` is the durable order-intent journal introduced by R10 phase 1
(magi-core `lib/order-intents.js`). Every order sent through
`executeMoomooOrder()` is journaled as a `PENDING` event **before** the broker
POST, and its `intent_id` (`i_` + 12 hex chars) rides in the broker remark as
`<unit_name>:<intent_id>` — that remark is the reconciliation key and stays
durable at the broker even when BigQuery is down.

The table is **append-only / event-sourced** (same pattern as
[order-approvals](order-approvals.md)): lifecycle transitions are appended as
event rows and the latest event per `intent_id` is the current state. No
UPDATE/DELETE — so inserts never hit the streaming-buffer restriction.

# Events

| event | Meaning |
|---|---|
| `PENDING` | Intent journaled before the broker POST. If a `CONFIRMED`/`REJECTED`/`UNKNOWN` event never follows, the process died mid-flight. |
| `CONFIRMED` | Broker accepted the order; `broker_order_id` (+ fill fields when present) recorded. |
| `REJECTED` | Broker refused the order before dispatch (HTTP 4xx or `success=false`). |
| `UNKNOWN` | Response lost — fetch threw or HTTP 5xx/proxy crash. The broker may or may not hold the order; resolved by reconciliation, **never** by blind resubmission. |
| `RECONCILED` | Matched against broker `order_history` by remark; `broker_order_id` and fill fields populated. |
| `LOST` | No broker order found within 24h — the order never reached the broker. |

# Schema

| Column | Type | Description |
|---|---|---|
| intent_id | STRING | Journal key (`i_` + 12 hex); embedded in the broker remark. |
| event | STRING | Lifecycle event (see table above). |
| session_id | STRING | Trading session that issued the intent. |
| unit_name | STRING | PLM unit (e.g. `MELCHIOR-1`); also the remark prefix. |
| symbol | STRING | Ticker, MAGI form (e.g. `AAPL`). |
| side | STRING | `BUY` / `SELL`. |
| qty | FLOAT64 | Requested quantity. |
| price_hint | FLOAT64 | Caller-supplied price hint (PENDING event only). |
| broker_order_id | STRING | MooMoo order id (CONFIRMED / RECONCILED). |
| filled_price | FLOAT64 | Broker dealt price when known. |
| filled_qty | FLOAT64 | Broker dealt quantity when known. |
| detail | STRING | Error text / match detail / status notes. |
| created_at | TIMESTAMP | Event write time. |

# Reconciliation contract

* The daily evaluator (`magi-evaluator`) calls `reconcileOpenIntents()` before
  trade evaluation: intents whose latest event is `PENDING`/`UNKNOWN` and are
  ≥10 min old are matched against `/trade/order_history` (broker, ≤90d window)
  by remark containment of `intent_id`.
* A matched broker order that is **filled but has no `trades` row** is an
  ORPHAN FILL — paged via Telegram ALERT for manual journaling. A synthetic
  `trades` row is never written automatically: it would lack real `thought_id`
  lineage and would poison evaluation inputs.
* Unmatched intents older than 24h become `LOST` + alert.
* A failed `order_history` fetch leaves intents open for the next run — no
  terminal event is written on unverifiable data.

# Fail policy on journal write

* If the `PENDING` write fails, **exposure-increasing orders fail closed**
  (`INTENT_JOURNAL_FAILED`): an unrecordable new exposure must not fire.
* Risk-reducing orders still proceed — the failed row is already on the
  session retry queue, the intent id rides in the broker remark anyway, and
  blocking an exit during a BQ outage is the greater hazard. This mirrors the
  reduce-only degraded mode enforced independently by the
  [magi-moomoo](/system/services/magi-moomoo.md) order gate and by
  magi-core's L0/L1.5/L1.7 layers.

# Notes

* Phase 1 stores intents in BigQuery itself; the remark key is what provides
  durability when BQ is unavailable. A later R10 phase adds a write-side
  outbox on non-BQ storage (GCS/Firestore) so the journal itself does not
  depend on the same datastore as the rest of the pipeline.
* `session_id` is still not consumed by the bridge for idempotency; the
  `intent_id` in the remark serves the dedup/reconciliation role.
