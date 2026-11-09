---
type: BigQuery Table
title: gemini_pattern_analysis
description: Periodic Gemini-generated win/lose pattern report across recent trades.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=gemini_pattern_analysis&page=table
lilith_safe: false
status: stable
generated: { by: devin/local, at: 2026-09-17T17:36:54Z }
verified: { by: human:jun, at: 2026-09-17T17:36:54Z }
stale_after: 2027-03-17T17:36:54Z
tags: [echidna, bigquery, gemini, analysis, patterns]
dataset: magi_core
table_type: BASE TABLE
---

Periodic batch analysis where Gemini summarizes winning vs losing trade patterns.
Cross-unit processed intelligence — `lilith_safe: false`.

This is **generic** pattern analysis (logical / quantitative), *not* causal
analysis: causal analysis was written by the retired SEKHMET analyzer to
`fugu_sequential_patterns` (deprecated 2026-09-17), and the SQL-based
static causal classification lives in [daphne-feedback](daphne-feedback.md).
See [causal analysis ownership](/system/plm-units/index.md#causal-analysis-ownership).

# Schema

| Column | Type | Description |
|---|---|---|
| analysis_id | STRING | PK. |
| analyzed_at | TIMESTAMP | Run time. |
| trade_count_win | INT64 | Wins analyzed. |
| trade_count_lose | INT64 | Losses analyzed. |
| full_analysis | STRING | Generated analysis text. |
| model_version | STRING | Gemini model version. |
| prompt_tokens / output_tokens | INT64 | Token usage. |

# Joins

* Derived from [trades](trades.md) outcomes.

# Citations

* Producer (Jun, 2026-11-09): `magi-core/kimi-analyzer.js` pattern + causal stage —
  Cloud Run job `magi-kimi-analyzer`, Cloud Scheduler `magi-kimi-analyzer-daily`
  (`0 22 * * 1-5` America/New_York), Kimi `kimi-k3.1-pro` (`reasoning_effort=high`).
  Rows carry `model_version = kimi-k3.1-pro`; earlier rows (`gemini-3.8-flash`) came
  from the retired `magi-gemini-analyzer` and are kept for Gemini-vs-Kimi comparison.
  The table name keeps its historical `gemini_` prefix; `full_analysis` now also
  contains the time-ordered causal section formerly owned by SEKHMET.
