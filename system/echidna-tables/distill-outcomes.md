---
type: BigQuery Table
title: distill_outcomes (proposed)
description: L1 normalized outcome records — realized P&L, 10-trading-day mark-to-market, shadow virtual results and unevaluable decisions kept as distinct kinds, never merged into one "result" column.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-09T23:03:00Z }
stale_after: 2027-04-09T23:03:00Z
tags: [echidna, bigquery, distillation, proposed]
dataset: magi_core
table_type: BASE TABLE (proposed — does not exist yet)
---

> **Draft — proposed table, not yet created.** Written only by the offline
> extractor — **never by the live path**. The DDL lives in `magi-core`
> (`sql/`) for Jun to apply.

L1 outcome records matching the `validateOutcome` contract in
`lib/experience-distillation.js`, extended by the GPT-review finding that
the original 4-kind contract could not express **maturity vs valuation**:

* a position still open at the 10-trading-day maturity point is
  evaluable but is **not realized P&L** — it is mark-to-market;
* `kind`, `maturity_status` and `valuation_basis` are therefore separate
  columns rather than one enum.

# Outcome kinds

| kind | maturity_status | valuation_basis | meaning |
|---|---|---|---|
| `realized` | `closed` | `realized_fills` | position closed; P&L from confirmed fills |
| `mark_to_market` | `mature_10d` | `mark_to_market` | reached the 10-trading-day maturity still open; valued at `price_source` |
| `shadow_virtual` | varies | `virtual` | NOT_ADOPTED / SHADOW counterfactual evaluation |
| `immature` | `immature` | `none` | outcome window not yet reached |
| `unevaluable` | `unevaluable` | `none` | cannot be evaluated (missing fills, inconsistent lineage) — **never** recorded as a loss |

# Schema (proposed)

| Column | Type | Description |
|---|---|---|
| decision_id | STRING | Decision this outcome evaluates (joins `distill_decisions`). |
| record_version | INT64 | Correction chain; latest valid version wins (≥1). |
| record_hash | STRING | Content hash for dedupe/conflict detection. |
| kind | STRING | See kinds table. |
| maturity_status | STRING | `closed` / `mature_10d` / `immature` / `unevaluable`. |
| valuation_basis | STRING | `realized_fills` / `mark_to_market` / `virtual` / `none`. |
| pnl_usd | NUMERIC | Realized or mark-to-market USD value (strict number — `NULL` never passes as 0). |
| virtual_pnl_usd | NUMERIC | Shadow/virtual estimate. |
| fee_total_usd | NUMERIC | Fees allocated to this outcome. |
| entry_fill_ids | ARRAY&lt;STRING&gt; | `order_fills.fill_id`s of the entry legs. |
| exit_fill_ids | ARRAY&lt;STRING&gt; | `order_fills.fill_id`s of the exit legs (may be several). |
| price_source | STRING | MTM valuation source (`moomoo_snapshot`, …) for `mark_to_market`. |
| eval_rule_version | STRING | Version of the allocation/maturity rule used. |
| trading_calendar_version | STRING | Trading-day calendar version anchoring the 10-day count. |
| evidence_fill_confirmed | BOOL | `realized` requires broker-confirmed fill evidence. |
| evaluated_at | TIMESTAMP | When the evaluator priced this outcome. |
| finalized_at | TIMESTAMP | When the outcome became final (used for watermark maturity). |
| reason | STRING | `unevaluable` reason. |
| extractor_version | STRING | Extractor version. |
| extracted_at | TIMESTAMP | Extraction instant. |

# Contracts

* **Realized ≠ mature ≠ virtual** are never conflated. Reports comparing
  units state the basis used; mixing `realized_fills` and `virtual`
  numbers in one average is a contract violation.
* **Fill links are explicit.** P&L traces to `order_fills` rows, so
  partial fills and multi-leg exits reconcile exactly.
* **10-trading-day anchor is fixed.** The maturity clock starts at the
  entry fill time under a versioned trading calendar — both recorded per
  row.
