---
type: BigQuery Table
title: trades_quarantine
description: Immutable snapshot of trades rows marked CONTAMINATED (fabricated fills).
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=trades_quarantine&page=table
lilith_safe: false
status: stable
generated: { by: devin/local, at: 2026-09-13T00:00:00Z }
verified: { by: human:jun, at: 2026-09-13T00:00:00Z }
stale_after: 2027-03-13T00:00:00Z
tags: [echidna, bigquery, trades, audit, quarantine]
dataset: magi_core
table_type: BASE TABLE
---

`trades_quarantine` preserves the original contents of every
[trades](trades.md) row whose `result` was set to `CONTAMINATED` — rows the
R02 audit proved were never filled at the broker (order status
`CANCELLED_ALL`) yet carried fabricated prices and PnL. The snapshot keeps
full provenance so the quarantine is auditable and reversible.

# Schema

All `trades` columns, plus:

| Column | Type | Description |
|---|---|---|
| quarantine_reason | STRING | e.g. `NEVER_FILLED`. |
| quarantine_source | STRING | Evidence pointer (audit artifact). |
| quarantined_at | TIMESTAMP | Snapshot time. |

# Notes

* The quarantined `trades` rows keep `result='CONTAMINATED'`; consumers must
  explicitly exclude them unless they use a positive allowlist such as
  `result IN ('WIN','LOSE')`. Generic predicates like `result IS NOT NULL`
  still return them.
