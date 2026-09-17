---
type: BigQuery Table
title: pre_trade_intelligence
description: HERMES per-symbol Brave/Gemini pre-trade intelligence — sentiment, key events, risk factors.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=pre_trade_intelligence&page=table
lilith_safe: false
status: draft
generated: { by: devin/local, at: 2026-09-17T00:29:00Z }
verified: [{ by: devin/local, at: 2026-09-16T01:30:00Z }, { by: human:jun, at: 2026-09-16T02:00:00Z }, { by: devin/local, at: 2026-09-17T00:29:00Z }]
stale_after: 2027-03-17T00:29:00Z
tags: [echidna, bigquery, hermes, sentiment, news]
dataset: magi_core
table_type: BASE TABLE
---

`pre_trade_intelligence` is the `[HERMES:BRAVE]` output table — one row per
symbol per collection pass, produced by Brave Search retrieval + Gemini
structured-output scoring (see the HERMES intelligence stack in
[magi-core](/system/services/magi-core.md)). **Must never reach LILITH** —
it is processed cross-source intelligence; LILITH clean-source mode
(`skipLLMProcessed`) skips this block.

Schema verified against the live table (`bq show`) on 2026-09-16; the writer
implementation was compared at magi-core `9ae8a966b732da5a735ad8c1a5554777fa07c215`
(`src/hermes.js` `saveHermesIntelligence` / `collectSymbolIntelligence`).
The table is **not partitioned** — `collected_at` is the freshness signal.

# Schema

| Column | Type | Description |
|---|---|---|
| id | STRING | UUID per row. |
| date | DATE | ET market date (`etDateString()`). |
| symbol | STRING | Ticker. |
| sentiment | STRING | Sentiment label from Gemini. |
| sentiment_score | FLOAT64 | Score in [-1, 1]. |
| key_events | STRING (REPEATED) | Structured event list from Gemini. |
| risk_factors | STRING (REPEATED) | Structured risk list from Gemini. |
| summary | STRING | Short English summary (<=150 chars per the response schema). |
| source_count | INT64 | Number of Brave articles scored. |
| raw_sources | JSON | Native JSON article list (title/description). |
| collected_at | TIMESTAMP | Collection time — the freshness signal (`HERMES_REFRESH_INTERVAL_HOURS`, default 2h reuse window). |
| model_used | STRING | Gemini model (`HERMES_GEMINI_MODEL`). |
| created_at | TIMESTAMP | Insert time. |

# Citations

* Writer: `magi-core/src/hermes.js` (`saveHermesIntelligence`, reached via
  `collectHermesIntelligence` from the `magi-hermes-refresh` job and the
  in-session fallback).
* Readers: `src/hermes.js` (`getHermesIntelligence` /
  `buildHermesSection` — the `[HERMES]` prompt block), the
  `magi-hermes-intelligence` Grafana dashboard, and
  [hermes_collection_runs](hermes-collection-runs.md) which records the
  per-run outcome counters for this pipeline.
