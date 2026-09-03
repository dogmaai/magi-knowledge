---
type: BigQuery Table
title: gemini_pattern_analysis
description: Periodic Gemini-generated win/lose pattern report across recent trades.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=gemini_pattern_analysis&page=table
lilith_safe: false
tags: [echidna, bigquery, gemini, analysis, patterns]
dataset: magi_core
table_type: BASE TABLE
---

Periodic batch analysis where Gemini summarizes winning vs losing trade patterns.
Cross-unit processed intelligence — `lilith_safe: false`.

This is **generic** pattern analysis (logical / quantitative), *not* causal
analysis: causal analysis is written by SEKHMET to
[fugu-sequential-patterns](fugu-sequential-patterns.md), and the SQL-based
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

* Producer: `magi-core/jobs/gemini-analyzer/index.js` — Cloud Run job
  `magi-gemini-analyzer`, Cloud Scheduler `magi-gemini-analyzer-daily`
  (`0 14 * * 1-5` UTC), AI Studio `gemini-3.8-flash`.
