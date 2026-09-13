---
type: BigQuery Table
title: trades_price_corrections
description: Original values of trades rows whose recorded quote price was corrected to the broker dealt price.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=trades_price_corrections&page=table
lilith_safe: false
status: stable
generated: { by: devin/local, at: 2026-09-13T00:00:00Z }
verified: { by: human:jun, at: 2026-09-13T00:00:00Z }
stale_after: 2027-03-13T00:00:00Z
tags: [echidna, bigquery, trades, audit, correction]
dataset: magi_core
table_type: BASE TABLE
---

`trades_price_corrections` is the pre-correction snapshot of
[trades](trades.md) rows whose `price` was the submission-time quote rather
than the broker fill. The correction backfilled `price` (and where relevant
`entry_price`, `exit_price`, `qty`, `pnl_*`, `price_confirmed`) with the
broker `dealt_avg_price` / `dealt_qty`; this table keeps the original row so
every correction is auditable and reversible.

# Schema

All `trades` columns (original values), plus:

| Column | Type | Description |
|---|---|---|
| corrected_price | FLOAT64 | Broker `dealt_avg_price` written into `trades`. |
| corrected_qty | FLOAT64 | Broker `dealt_qty` written into `trades`. |
| backed_up_at | TIMESTAMP | Snapshot time. |
