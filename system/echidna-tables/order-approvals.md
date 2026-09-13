---
type: BigQuery Table
title: order_approvals
description: Single-use approval tokens for non-reducing manual orders through the magi-moomoo order gate.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=order_approvals&page=table
lilith_safe: false
status: stable
generated: { by: devin/local, at: 2026-09-13T00:00:00Z }
verified: { by: human:jun, at: 2026-09-13T00:00:00Z }
stale_after: 2027-03-13T00:00:00Z
tags: [echidna, bigquery, orders, approval, security]
dataset: magi_core
table_type: BASE TABLE
---

`order_approvals` is an append-only log backing the
[magi-moomoo](/system/services/magi-moomoo.md) order gate. magi-moni (AKA-1 /
Telegram) writes an `ISSUED` row only after a confirmed user approval;
magi-moomoo validates the token against the pending order's parameters and
appends a `USED` row when it is consumed. A token is valid for ~60 seconds,
is bound to `symbol`/`side`/`qty`, and can be consumed exactly once. Risk-
reducing orders never need a token.

# Schema

| Column | Type | Description |
|---|---|---|
| token | STRING | Opaque single-use token (issued by magi-moni). |
| event | STRING | `ISSUED` / `USED`. |
| symbol | STRING | Ticker the approval is bound to. |
| side | STRING | `buy` / `sell` the approval is bound to. |
| qty | FLOAT64 | Quantity the approval is bound to. |
| created_by | STRING | Issuing service / actor (e.g. `magi-moni`). |
| order_id | STRING | Reserved for a broker order id; the gate consumes the token *before* submission, so `USED` rows currently write NULL. |
| expires_at | TIMESTAMP | Token expiry; expired tokens are invalid. |
| created_at | TIMESTAMP | Row write time. |

# Notes

* The model behind the Telegram bot cannot self-authorize: the token exists
  only after the human confirmation path ran. `confirmed=true` arguments are
  not accepted as authorization.
* Gate behavior when this table is unreachable is fail-closed for
  non-reducing orders.
