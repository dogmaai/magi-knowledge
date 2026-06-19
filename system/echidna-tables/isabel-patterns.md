---
type: BigQuery Table
title: isabel_patterns
description: ISABEL win/lose reasoning centroids and win-rates per symbol/direction/unit.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=isabel_patterns&page=table
lilith_safe: false
tags: [echidna, bigquery, isabel, patterns, embeddings]
dataset: magi_core
table_type: BASE TABLE
---

ISABEL's learned patterns: embedding centroids of winning vs losing reasonings
plus win-rate stats, keyed by symbol/direction/provider. Per-unit win-rates make
this `lilith_safe: false`.

# Schema

| Column | Type | Description |
|---|---|---|
| pattern_id | STRING | PK. |
| symbol | STRING | Ticker. |
| direction | STRING | `buy` / `sell`. |
| llm_provider | STRING | Provider key. |
| pattern_type | STRING | Pattern category. |
| win_rate | FLOAT64 | Win-rate for the pattern. |
| win_count / lose_count | INT64 | Outcome counts. |
| sample_size | INT64 | n. |
| avg_confidence | FLOAT64 | Mean confidence. |
| win_centroid / lose_centroid | ARRAY&lt;FLOAT64&gt; | Embedding centroids. |
| centroid_similarity | FLOAT64 | Win vs lose centroid similarity. |
| top_win_reasonings | ARRAY&lt;STRING&gt; | Representative winning reasonings. |
| top_lose_reasonings | ARRAY&lt;STRING&gt; | Representative losing reasonings. |
| created_at | TIMESTAMP | Build time. |

# Joins

* `llm_provider` → [plm-units](/system/plm-units/)
* Derived from [trades](trades.md) + [thoughts](thoughts.md) + thought_embeddings.

# Citations

* Producer: ISABEL framework (`magi-isabel` service). See [services/magi-isabel](/system/services/magi-isabel.md).
