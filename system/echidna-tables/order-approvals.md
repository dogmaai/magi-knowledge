---
type: BigQuery Table
title: order_approvals
description: Single-use approval tokens for non-reducing manual orders through the magi-moomoo order gate.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=order_approvals&page=table
lilith_safe: false
status: stable
generated: { by: devin/cli, at: 2026-09-17T05:30:00Z }
verified: [{ by: human:jun, at: 2026-09-13T00:00:00Z }, { by: human:jun, at: 2026-10-06T05:36:00Z }]
stale_after: 2027-04-04T05:36:00Z
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
from the earlier strictly-append-only model (2026-09-17; re-verified by
Jun 2026-10-06).

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

## Staged Discord migration pointer (unverified)

Navigation pointer added 2026-11-08 by devin/web. This section is **outside this concept's existing `verified` records and
has not been verified by human:jun**. It does not modify the verified content
above, which remains the baseline until Jun verifies a replacement.
Proposed, not deployed, Discord behavior and the acceptance, rollback and
Telegram retirement gates are in the draft [migration plan](../services/discord-migration.md).
It asserts no cutover and authorizes no secret deletion, schema change or
LILITH boundary change.

Known implementation drift (reported 2026-11-08, not resolved here): the Notes
above are the verified specification. magi-moni
`2ec39dcda90641bc250e51b0108a96b4d36a5f31` `lib/tools.js`
(`akaTool_moomooPlaceOrder`) issues an approval token when the model passes
`confirmed=true`, contrary to the Notes. Which revision production runs was
not verified. The proposed correction is
[magi-moni#58](https://github.com/dogmaai/magi-moni/pull/58) (draft, not
merged or deployed).
