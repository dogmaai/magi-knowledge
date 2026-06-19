---
type: BigQuery Table
title: thoughts
description: LLM reasoning log — one row per decision, with action, reasoning, and confidence.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=thoughts&page=table
lilith_safe: false
tags: [echidna, bigquery, thoughts, reasoning, core]
dataset: magi_core
table_type: BASE TABLE
---

`thoughts` captures each unit's reasoning for a decision. The
[`thoughts_active`](views.md) VIEW filters it; the LILITH `rejected`-example
miner reads the view.

# Schema

| Column | Type | Description |
|---|---|---|
| session_id | STRING | FK → [sessions](sessions.md).session_id. |
| timestamp | TIMESTAMP | Decision time (UTC). |
| content | STRING | Raw model completion. |
| trade_mode | STRING | `live` / `paper` / `simulation`. |
| llm_provider | STRING | Provider key. |
| unit_name | STRING | MAGI unit name. |
| symbol | STRING | Ticker under consideration. |
| action | STRING | `BUY` / `SELL` / `HOLD`. |
| reasoning | STRING | Parsed reasoning / thesis. |
| hypothesis | STRING | Stated hypothesis. |
| confidence | FLOAT64 | Self-reported confidence `0.0–1.0`. |
| concerns | STRING | Stated risks/concerns. |
| prompt_version | STRING | Constitution / prompt version. |
| thought_id | STRING | PK; FK target for [trades](trades.md).thought_id. |
| vix_estimate | FLOAT64 | VIX level estimate at decision. |
| vix_regime | STRING | VIX regime label. |
| reasoning_content | STRING | Extended chain-of-thought (when provided). |
| ariel_context_used | BOOL | Whether ARIEL market context was injected. |

# Joins

* `thought_id` ← [trades](trades.md).thought_id
* `session_id` → [sessions](sessions.md).session_id
* `thought_id` → [thought-quality-scores](thought-quality-scores.md).thought_id

# Examples

Mine high-confidence directional thoughts on thin data (the
[confidence-override](/_lilith_safe/hallucination-patterns/confidence-override.md)
hallucination shape):

```sql
SELECT thought_id, symbol, action, confidence, reasoning
FROM `screen-share-459802.magi_core.thoughts_active`
WHERE action IN ('BUY','SELL') AND confidence > 0.7
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY);
```

# Citations

* Writer: `validateThoughtRow()` / `safeInsert('thoughts', ...)` in `magi-core/lib/bigquery.js`.
* Consumer: `lilith-training/scripts/extract_hallucination_negatives.py` (reads `thoughts_active`).
