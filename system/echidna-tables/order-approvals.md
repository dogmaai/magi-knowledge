---
type: BigQuery Table
title: order_approvals
description: Single-use approval tokens for non-reducing manual orders through the magi-moomoo order gate.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=order_approvals&page=table
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-09-17T05:30:00Z }
verified: { by: human:jun, at: 2026-09-13T00:00:00Z }
stale_after: 2027-03-17T05:30:00Z
tags: [echidna, bigquery, orders, approval, security]
dataset: magi_core
table_type: BASE TABLE
---

`order_approvals` backs the
[magi-moomoo](/system/services/magi-moomoo.md) order gate. magi-moni (AKA-1 /
Telegram) writes an `ISSUED` row only after a confirmed user approval;
magi-moomoo validates the token against the pending order's parameters and
consumes it before submission. A token is valid for ~60 seconds,
is bound to `symbol`/`side`/`qty`, and can be consumed exactly once. Risk-
reducing orders never need a token.

Consumption is atomic under BigQuery snapshot isolation: concurrent
appends do not conflict, so a pure `INSERT ... WHERE NOT EXISTS` claim
cannot prevent double-spend. The gate therefore claims inside a
multi-statement transaction — a conditional `UPDATE` stamps a unique
`claim:<uuid>` onto the `ISSUED` row's `order_id` (only while `NULL` and
no `USED` row exists), then appends the `USED` audit event. Concurrent
transactions modifying the same row conflict, so at most one claimant
commits. The `USED` event stream remains append-only; the `ISSUED` row is
mutated exactly once, at consumption — this is a deliberate deviation
from the earlier strictly-append-only model (2026-09-17, pending Jun
re-verification).

# Schema

| Column | Type | Description |
|---|---|---|
| token | STRING | Opaque single-use token (issued by magi-moni). |
| event | STRING | `ISSUED` / `USED`. |
| symbol | STRING | Ticker the approval is bound to. |
| side | STRING | `buy` / `sell` the approval is bound to. |
| qty | FLOAT64 | Quantity the approval is bound to. |
| created_by | STRING | Issuing service / actor (e.g. `magi-moni`). |
| order_id | STRING | On `ISSUED` rows, carries the consumption claim (`claim:<uuid>`) once the token is spent; NULL before. `USED` rows write the same claim. |
| expires_at | TIMESTAMP | Token expiry; expired tokens are invalid. |
| created_at | TIMESTAMP | Row write time. |

# Notes

* The model behind the Telegram bot cannot self-authorize: the token exists
  only after the human confirmation path ran. `confirmed=true` arguments are
  not accepted as authorization.
* Gate behavior when this table is unreachable is fail-closed for
  non-reducing orders.
