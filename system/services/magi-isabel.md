---
type: Service
title: magi-isabel
description: ISABEL pattern framework — win/lose centroids and embedding analysis.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-06T08:00:00Z }
verified: { by: human:jun, at: 2026-06-19T01:06:40Z }
stale_after: 2026-12-16T01:06:40Z
tags: [service, isabel, embeddings, patterns]
repo: dogmaai/magi-isabel
---

# Overview

ISABEL (**I**ntelligent **S**trategy **A**nalysis and **B**ehavioral **E**valuation
**L**earner) is MAGI's learning/feedback framework. It correlates LLM trade
reasoning with BigQuery execution records, builds win vs lose reasoning centroids
(Cohere embeddings), and produces pattern stats per symbol/direction/unit, which
the guard layers consume.

# Produces

* [isabel-patterns](/system/echidna-tables/isabel-patterns.md) — per-provider
  win/lose keywords and pattern summaries (`isabel_l4_patterns` table).
  Win/lose centroids and per-symbol/direction stats ride inside
  `isabel_daily_cache` (`patterns_json` / `embeddings_json` columns), not a
  dedicated table.
* ISABEL stats blocks (the cross-unit aggregate; LILITH uses only its **own** slice).

# Consumed by

* [L5](/system/guards/l5.md) thought-similarity (lose centroids).
* [L7](/system/guards/l7.md) composite scoring.
* ISABEL L4 Cohere embedding analysis (`magi-core/src/isabel_l4.js`, `lib/embeddings.js`).

# Contamination note

ISABEL's aggregate stats are cross-unit and `lilith_safe: false`. LILITH may use
only its own `unit_name` slice (the
[ISABEL_STATS_BLOCK](/_lilith_safe/schemas/isabel-stats-block.md) schema), never
the cross-unit centroids.
