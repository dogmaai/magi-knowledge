---
type: BigQuery Table
title: broker_position_snapshots (proposed)
description: Proposed append-only snapshot of per-symbol broker positions — written by the bridge-monitor probe which already reads /trade/positions every 15 minutes — so Grafana can show current holdings and their freshness.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&page=datasets
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-26T10:36:00Z }
verified: [{ by: devin/cli, at: 2026-10-26T10:36:00Z }]
stale_after: 2027-04-26T10:36:00Z
tags: [echidna, bigquery, positions, bridge, grafana, proposed]
dataset: magi_core
table_type: BASE TABLE (proposed — not created)
---

> **Draft — design proposal only.** The table does not exist; creation is a
> Jun operation. No code change is proposed in this document.

# Problem

Per-symbol positions are nowhere persisted. `portfolio_snapshots` stores only
the aggregate `positions_value`; `trades`/`order_fills` record fills but
deriving open positions from them is fragile (unconfirmed legs, ORPHAN_CLOSE,
manual trades). Grafana therefore cannot display "what do we hold right now"
with symbol/qty/cost — the 2026-10-26 sync audit (magi-core#668) confirmed the
aggregate value matches the broker but per-symbol detail is displayable only
as "0" vs ">0".

# Proposal

Extend the existing `positions_e2e` probe in `lib/bridge-monitor.js`
(magi-core): it already calls `/trade/positions` every 15 minutes for liveness —
persist the returned payload instead of discarding it. No new scheduler, no new
endpoint, no additional bridge load.

Deliberately a **new table**, not new columns on `bridge_health_checks`: the
liveness log is one row per probe run, while a probe can return N positions
(0..n rows per run). A separate append-only table keeps the health schema
stable.

## Proposed schema

| Column | Type | Description |
|---|---|---|
| `checked_at` | TIMESTAMP | Probe run time; partition key (DAY). Joins to `bridge_health_checks.checked_at`. |
| `trd_env` | STRING | Broker environment reported by the bridge (`SIMULATE` / `REAL`) — guards against mode mixing. |
| `symbol` | STRING | Broker symbol code as returned by the bridge. |
| `qty` | FLOAT64 | Quantity held (sign convention per bridge response; document on implementation). |
| `cost_price` | FLOAT64 | Broker-reported cost basis per share. |
| `market_value` | FLOAT64 | Broker-reported current market value of the position, if returned. |
| `raw` | STRING | Optional raw JSON of the position object, for forward-compatible fields. |

One row per position per probe run. A run with zero positions writes **no
rows** — consumers must distinguish "no rows at checked_at" (flat) from "no
probe" (stale) by joining against `bridge_health_checks` on `checked_at`.
Writers may alternatively emit a sentinel row (`symbol IS NULL`) per empty run;
decide at implementation time.

## Retention

Partition by `checked_at` (DAY). No hard expiry initially — volume is ~4
rows/day·symbol typical, ~2.8k probe runs/month worst case empty — review at
first human:jun verification.

## Uses

- Grafana per-symbol positions panel on `magi-broker-sync` (symbol, qty, cost,
  market value, age of probe).
- Reconciliation cross-check against `trades`-derived holdings.
- Detection of positions that persist unexpectedly (e.g. a sell that
  reconciled LOST).
