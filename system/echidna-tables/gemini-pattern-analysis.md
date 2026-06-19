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

* Producer: scheduled Gemini analysis job in `magi-core` / `magi-moni`.
