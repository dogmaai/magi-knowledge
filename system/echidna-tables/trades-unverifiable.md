---
type: BigQuery Table
title: trades_unverifiable
description: Snapshot of trades rows that can never be proven real or fabricated (no broker ground truth survives).
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=trades_unverifiable&page=table
lilith_safe: false
status: draft
generated: { by: devin/local, at: 2026-09-17T00:29:00Z }
verified: [{ by: human:jun, at: 2026-09-13T00:00:00Z }, { by: devin/local, at: 2026-09-17T00:29:00Z }]
stale_after: 2027-03-17T00:29:00Z
tags: [echidna, bigquery, trades, audit]
dataset: magi_core
table_type: BASE TABLE
---

`trades_unverifiable` is a flag table from the R02 contamination audit: it
snapshots [trades](trades.md) rows that **cannot be proven real or
fabricated** because no broker-side ground truth survives — Alpaca-era rows
(the Alpaca account no longer exists) and moomoo rows older than the
`history_order_list_query` 90-day window.

Unlike `trades_quarantine` these rows are **not** marked `CONTAMINATED` —
they are unproven, not disproven. Statistically ~9% are likely fabricated
(the observed in-window never-fill rate), but which ones is unknowable.

Consumers that need strictly verified data can anti-join on the broker order
id — the documented stable row key shared by both tables:

```sql
SELECT t.* FROM magi_core.trades t
WHERE NOT EXISTS (
  SELECT 1 FROM magi_core.trades_unverifiable u
  WHERE u.order_id = t.order_id
)
```

(`NOT EXISTS` rather than `NOT IN`, so a NULL `order_id` in the ledger cannot
empty the result.) Consumers that do not filter still get these rows with
their recorded outcomes.

# Schema

All `trades` columns, plus:

| Column | Type | Description |
|---|---|---|
| unverifiable_reason | STRING | `UNVERIFIABLE_ALPACA_SOURCE_REMOVED` / `UNVERIFIABLE_OUTSIDE_90D_WINDOW`. |
| unverifiable_source | STRING | Audit context pointer. |
| flagged_at | TIMESTAMP | Snapshot time. |
