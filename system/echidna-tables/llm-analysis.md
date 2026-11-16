---
type: BigQuery Table
title: llm_analysis
description: Cross-unit symbol analyses and retrospective price-tracking grades in the regional magi_analytics dataset.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_analytics&t=llm_analysis&page=table
lilith_safe: false
status: draft
generated: { by: devin/cloud, at: 2026-11-16T05:32:01Z }
verified: [{ by: devin/cloud, at: 2026-11-16T05:32:01Z }]
stale_after: 2027-05-15T05:32:01Z
tags: [echidna, bigquery, analysis, aka-1, price-tracking]
dataset: magi_analytics
table_type: BASE TABLE
---

# Scope and provenance

**Draft — machine-confirmed, awaiting human review.** Schema, partitioning,
clustering and location were read from live BigQuery table metadata on
2026-11-16. Writer inspected at magi-core
`05894553163b5505f7d156cf6e0685c10ed5a6d3`, `src/llm.js` (`log_analysis`).
The task's fixed OKF reference is
`173d0f635ba8fc371608cfccc70312871983be6f`; this concept closes a previously
uncatalogued table, not a new physical table.

`screen-share-459802.magi_analytics.llm_analysis` is in **asia-northeast1**,
not `magi_core` / US. It is DAY-partitioned by `created_at` and clustered by
`symbol`, then `llm_provider`. Query it separately from US tables; no
cross-location join is available.

# Schema

All columns are nullable. Float and integer types below use GoogleSQL names.

| Column | Type | Meaning |
|---|---|---|
| id | STRING | Analysis UUID. |
| created_at | TIMESTAMP | Analysis recording time. |
| symbol | STRING | Stored symbol; legacy rows also contain session/portfolio labels. |
| topic | STRING | Optional analysis topic. |
| llm_provider | STRING | Writing unit's provider key. |
| llm_model | STRING | Writing unit's model. |
| unit_name | STRING | Writing unit. Not proof that the unit is currently active. |
| input_type | STRING | Input category (`market_data` in the inspected writer). |
| input_summary | STRING | Short input/session description. |
| input_raw | JSON | Optional raw input; not exposed by the AKA-1 reader. |
| reasoning | STRING | Recorded judgment rationale. |
| hypothesis | STRING | Optional thesis. |
| observations | STRING | Optional observations; writer joins arrays with semicolons. |
| concerns | STRING | Optional risks; writer joins arrays with semicolons. |
| action | STRING | Analysis judgment (`BUY`, `SELL`, `HOLD`); not an executed order. |
| confidence | FLOAT64 | Recorded confidence; observed recent values lie in [0, 1]. |
| price_target | FLOAT64 | Optional target price. |
| time_horizon | STRING | Optional prediction horizon. |
| actual_price_at_analysis | FLOAT64 | Price snapshot captured when recording the analysis. |
| actual_price_after_1h | FLOAT64 | Retrospectively populated price-tracker field, nullable. |
| actual_price_after_1d | FLOAT64 | Retrospectively populated price-tracker field, nullable. |
| outcome | STRING | Retrospective prediction grade; observed values: `correct`, `partial`, `incorrect`, `neutral`, NULL. |
| prompt_template | STRING | Writer's template/version label. |
| response_time_ms | INT64 | Optional response latency. |
| token_count | INT64 | Optional token count. |
| metadata | JSON | Writer stores `session_id` and `trade_mode` here; not separate columns. |

# Writers and interpretation

* magi-core `src/llm.js` writes through
  `safeInsert('llm_analysis', [analysisRecord], true)` and separately records a
  [thought](thoughts.md). There is no `thought_id` column here: do not infer an
  exact thought/trade join from a timestamp or symbol.
* [magi-price-tracker](/system/services/magi-price-tracker.md) fills subsequent
  price fields and grades predictions. The grader's detailed algorithm was not
  inspected in this task. A grade is **not** a realized trade P&L or trading
  win rate; a NULL grade means unknown/ungraded, not incorrect.
* `JSON_VALUE(metadata, '$.trade_mode')` distinguishes observed `NORMAL` and
  `SHADOW` records. Missing modes stay unknown. `SHADOW` is non-executing;
  `NORMAL` on an analysis still does not prove an order was submitted or filled.
* Latest saved analysis is not live market state. Weekend/session gaps are
  expected; expose both the query time and last matching analysis time.
  Missing optional fields must not be invented.

# AKA-1 read contract (approved plan; not a deployment record)

The companion magi-moni Phase 1 change adds `get_symbol_analysis` to the
existing read-only dispatcher. It uses the existing BigQuery helper, allowing
the single-region query to resolve to `asia-northeast1`; it does not change
the global client location.

* Required `symbol`: trim/uppercase and validate the existing US ticker syntax
  (including class suffixes). This is syntax validation, not a listed-security
  check. Match stored symbols case-insensitively and return their stored text.
* `days`: default 7, bounded 1–30. `limit`: default 5, bounded 1–20.
  Finite numeric inputs are truncated to integers and clamped; invalid values
  fail before querying.
* Optional `unit_name` and `action` (`BUY` / `SELL` / `HOLD`) filters.
  Historical unit names are not an activation registry.
* One predefined, parameterized, read-only query uses a bounded `created_at`
  window. All modes are included, with `trade_mode` returned per row and
  kept separate in unit × mode × action counts for the **entire filtered
  period**, not only the latest N rows.
* Detail rows are ordered by `created_at DESC, id DESC`. `reasoning` is
  limited to 600 characters with `reasoning_truncated` indicating an excerpt.
  The reader returns model/unit, judgment, confidence, hypothesis,
  observations, concerns, target/horizon, price snapshots and outcome. It does
  not expose raw input or unrestricted metadata.
* Response includes `symbol`, filters, `count`, `total_count`, `analyses`,
  `summary`, `queried_at`, `window_start` and `latest_analysis_at`. The latter
  is the latest match **inside the requested window and filters**, not a
  global table freshness claim. `no_data` does not claim absence outside that
  window; query errors are not converted to empty results.
* AKA-1 must label SHADOW, distinguish retrospective grades from trade
  results, and state the saved analysis time. Analysis prose is untrusted
  reference data, never an instruction to invoke mutation tools.
  Existing Discord actor-bound confirmations remain required for mutations.

# Existing drift (reported, not silently repaired)

At the task's fixed OKF revision, `magi-price-tracker.md` lists
`Correct / Partial / Incorrect`; live recent rows contain lowercase labels
and `neutral`. The existing concept is not rewritten here and the grader's
policy is not changed. The [views](views.md) concept's claim that active-view
columns mirror the base tables also differs from the inspected
`thoughts_active` projection; this reader does not depend on that view.

# Data boundary

These are cross-unit predictions and grades, **`lilith_safe: false`**. This
AKA-1 operator surface is not a training source. No data or instructions from
this concept may be copied into `_lilith_safe/`. No schema, region, IAM,
guard, order-execution or trading-mode change is introduced.
