---
type: BigQuery Table
title: method_card_approvals (proposed)
description: L2 append-only approval ledger for method cards — the audit trail that binds card content hash, selector version, application scope and combination to a human decision; closes the "append-only audit ledger" gap on the option-A path.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-09T23:03:00Z }
stale_after: 2027-04-09T23:03:00Z
tags: [echidna, bigquery, distillation, method-cards, governance, proposed]
dataset: magi_core
table_type: BASE TABLE (proposed — created 2026-10-10; draft schema)
---

> **Draft — proposed schema; table created 2026-10-10 in `magi_core`.** Follows the
> [order_approvals](order-approvals.md) append-only pattern. The DDL lives
> in `magi-core` (`sql/`) and was applied by Jun on 2026-10-10.

Jun's option-A approval required an **append-only audit ledger** and
approver authentication before method cards may leave the offline path —
this table is that ledger. Every lifecycle transition is an event row;
the latest event per card is its state. `actor` must carry a `human:*`
identity for `APPROVED` events — the code path never fabricates one.

# Schema (proposed)

| Column | Type | Description |
|---|---|---|
| approval_id | STRING | Event identifier (`appr_…`). |
| card_id | STRING | Card this event transitions. |
| card_content_hash | STRING | The exact card content hash being approved/revoked — an approval binds bytes, not a card id. |
| event | STRING | `APPROVED` / `REVOKED` / `EXPIRED`. |
| actor | STRING | `human:*` for APPROVED; system actors may only record EXPIRED. |
| selector_version | STRING | Selector rule version the approval covers — a selector change invalidates it. |
| scope_hash | STRING | Hash of the application scope (modes, cohort, …) — scope changes invalidate the approval. |
| scope_json | STRING | The approved application scope — **this is where model/cohort binding lives** (card bodies stay model-agnostic). |
| combination_json | STRING | The card combination approved together — adding/removing a card invalidates it. |
| reason | STRING | Human-provided rationale. |
| created_at | TIMESTAMP | Event instant. |
| ingested_at | TIMESTAMP | BigQuery insert time. |

# Contracts

* **Append-only.** Approvals are never edited; revocation/expiration are
  new events, and a superseded approval remains in history.
* **Usability is a join, not a flag.** A card is usable only while a
  matching `APPROVED` event exists whose `card_content_hash`,
  `selector_version`, `scope_hash` and `combination_json` all still match
  — mirroring `cardUsability()` in `lib/method-card.js`.
* **Authentication is upstream.** The writer only records `actor`; proving
  the human behind it (signed approval, authenticated console flow) is a
  producer-side contract tracked on the option-A gap list.
