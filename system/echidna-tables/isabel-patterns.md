---
type: BigQuery Table
title: isabel_l4_patterns
description: ISABEL per-provider win/lose keyword patterns and reasoning summaries — the pattern-language layer behind L4/L5 signals.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=isabel_l4_patterns&page=table
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-06T08:00:00Z }
verified: { by: human:jun, at: 2026-06-19T01:02:48Z }
stale_after: 2026-12-16T01:02:48Z
tags: [echidna, bigquery, isabel, patterns, embeddings]
dataset: magi_core
table_type: BASE TABLE
---

ISABEL's learned patterns, stored per `llm_provider`: winning vs losing
reasoning keywords plus generated pattern summaries
(`win_pattern_summary` / `lose_pattern_summary` / `key_differences` /
`actionable_rules`). Read by `magi-core/lib/isabel.js` (L4 pattern
verbalization) and produced by the `magi-isabel-cache` daily job
(`isabel/l4-pattern-analyzer.js`, `isabel/l4-batch.js`).

Historical note: this doc originally described a per-symbol/direction
embedding-centroid table named `isabel_patterns`. That schema never
materialized in `magi_core` — centroid/embedding data rides inside
`isabel_daily_cache` JSON columns (`patterns_json`, `embeddings_json`) and
`thought_embeddings` instead. Corrected to the live table on 2026-10-06
(schema verified via `bq show`).

# Schema

| Column | Type | Description |
|---|---|---|
| analyzed_at | TIMESTAMP | Analysis run time (UTC). |
| llm_provider | STRING | Provider key the patterns belong to. |
| win_count | INT64 | Winning trades analyzed. |
| lose_count | INT64 | Losing trades analyzed. |
| win_keywords | STRING | Keywords frequent in winning reasonings. |
| lose_keywords | STRING | Keywords frequent in losing reasonings. |
| win_pattern_summary | STRING | Generated summary of winning patterns. |
| lose_pattern_summary | STRING | Generated summary of losing patterns. |
| key_differences | STRING | Generated win-vs-lose contrast. |
| actionable_rules | STRING | Generated rules fed back into prompts/guards. |

# Citations

* Writer: `magi-core/isabel-cache.mjs` → `isabel/l4-pattern-analyzer.js`,
  `isabel/l4-batch.js` (`magi-isabel-cache` job).
* Reader: `magi-core/lib/isabel.js` (`FROM magi_core.isabel_l4_patterns`),
  `src/isabel.js`.
