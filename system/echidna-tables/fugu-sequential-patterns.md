---
type: BigQuery Table
title: fugu_sequential_patterns
description: SEKHMET (Sakana fugu-ultra) offline sequential/causal outcome analysis of recent trades.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=fugu_sequential_patterns&page=table
lilith_safe: false
tags: [echidna, bigquery, sakana, fugu, causal, analysis]
dataset: magi_core
table_type: BASE TABLE
---

Output of the [SEKHMET](/system/plm-units/sekhmet.md) causal analyzer
(`magi-fugu-analyzer`, Mon & Fri 23:30 ET). One row per run: the last 90 days of
WIN/LOSE trades × thoughts read in strict timestamp order and analyzed by Sakana
`fugu-ultra` (`reasoning_effort=high`). This is MAGI's **causal** analysis
artifact; [gemini-pattern-analysis](gemini-pattern-analysis.md) is the generic
pattern report. Cross-unit processed intelligence — `lilith_safe: false`.

# Schema

| Column | Type | Description |
|---|---|---|
| analysis_id | STRING | PK (UUID per run). |
| analyzed_at | TIMESTAMP | Run time. |
| trade_count_win | INT64 | Wins analyzed. |
| trade_count_lose | INT64 | Losses analyzed. |
| full_analysis | STRING | Rendered human-readable analysis. |
| structured_analysis | STRING | Machine-readable JSON: `causal_insights`, winning/losing sequence signals, regime transitions, unit performance summary, improvement proposals. |
| summary_japanese | STRING | Short Japanese summary (used for Telegram). |
| model_version | STRING | Sakana model used (`fugu-ultra` by default, `SAKANA_MODEL`). |
| prompt_tokens / output_tokens | INT64 | Token usage. |

# Joins

* Derived from [trades](trades.md) × [thoughts](thoughts.md) (90-day window, ordered by timestamp).

# Citations

* Producer: `magi-core/fugu-analyzer.js` (`CREATE TABLE IF NOT EXISTS`; columns added by `sql/alter_fugu_sequential_patterns.sql`).
