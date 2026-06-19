---
type: BigQuery Table
title: thought_quality_scores
description: Per-thought quality scoring (structure, sentiment, keywords, embedding, novelty).
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=thought_quality_scores&page=table
lilith_safe: false
tags: [echidna, bigquery, quality, scoring]
dataset: magi_core
table_type: BASE TABLE
---

Scores each thought across six sub-scores and a predicted win probability.

# Schema

| Column | Type | Description |
|---|---|---|
| thought_id | STRING | FK → [thoughts](thoughts.md).thought_id. |
| session_id | STRING | FK → [sessions](sessions.md).session_id. |
| llm_provider | STRING | Provider key. |
| symbol / side | STRING | Ticker / direction. |
| confidence | FLOAT64 | Self-reported confidence. |
| total_score | FLOAT64 | Aggregate quality score. |
| quality_rank | STRING | Rank bucket. |
| s1_structure | FLOAT64 | Structure sub-score. |
| s2_sentiment | FLOAT64 | Sentiment sub-score. |
| s3_keywords | FLOAT64 | Keyword sub-score. |
| s4_embedding | FLOAT64 | Embedding sub-score. |
| s5_stale_penalty | FLOAT64 | Penalty for stale phrasing. |
| s6_novelty_bonus | FLOAT64 | Novelty bonus. |
| s1_details..s4_details | STRING | Sub-score detail blobs. |
| win_probability | FLOAT64 | Predicted win probability. |
| prediction_source | STRING | Model/source of prediction. |
| scored_at | TIMESTAMP | Scoring time. |

# Joins

* `thought_id` → [thoughts](thoughts.md).thought_id

# Citations

* Producer: thought-quality scoring pipeline in `magi-core`. Related: `stale_phrases` table.
