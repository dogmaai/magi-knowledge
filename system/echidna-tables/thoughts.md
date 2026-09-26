---
type: BigQuery Table
title: thoughts
description: LLM reasoning log — one row per decision, with action, reasoning, and confidence.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=thoughts&page=table
lilith_safe: false
status: draft
generated: { by: devin/local, at: 2026-09-26T08:45:00Z }
verified: { by: human:jun, at: 2026-09-21T22:11:42Z }
stale_after: 2027-03-17T17:36:54Z
tags: [echidna, bigquery, thoughts, reasoning, core]
dataset: magi_core
table_type: BASE TABLE
---

`thoughts` captures each unit's reasoning for a decision. The
[`thoughts_active`](views.md) VIEW filters it; the LILITH `rejected`-example
miner reads the view.

Guard layers also append audit rows via `logGuardBlock()` — `id` prefixed
`block_`, `action` and `trade_mode` set to `BLOCKED` (`WARN_ONLY` for
warn-only layers), `concerns` carrying the layer id (e.g. `L7`, `JEV`), and
`reasoning` the block reason. These document blocked decisions, not LLM
reasoning.

# Schema

| Column | Type | Description |
|---|---|---|
| session_id | STRING | FK → [sessions](sessions.md).session_id. |
| timestamp | TIMESTAMP | Decision time (UTC). |
| content | STRING | Raw model completion. |
| trade_mode | STRING | `live` / `paper` / `simulation`; `BLOCKED` / `WARN_ONLY` on guard-block rows. |
| llm_provider | STRING | Provider key. |
| unit_name | STRING | MAGI unit name. |
| symbol | STRING | Ticker under consideration. |
| action | STRING | `BUY` / `SELL` / `HOLD`; `BLOCKED` / `WARN_ONLY` on guard-block rows. |
| reasoning | STRING | Parsed reasoning / thesis. |
| hypothesis | STRING | Stated hypothesis. |
| confidence | FLOAT64 | Self-reported confidence `0.0–1.0`. |
| concerns | STRING | Stated risks/concerns; guard layer id (e.g. `L7`, `JEV`) on guard-block rows. |
| prompt_version | STRING | Constitution / prompt version. |
| thought_id | STRING | PK; FK target for [trades](trades.md).thought_id. |
| vix_estimate | FLOAT64 | VIX level estimate at decision. |
| vix_regime | STRING | VIX regime label. |
| reasoning_content | STRING | Extended chain-of-thought (when provided). |
| ariel_context_used | BOOL | Whether ARIEL market context was injected. |

# Joins

* `thought_id` ← [trades](trades.md).thought_id — primary key; subject to the
  attribution-integrity contract below.
* `session_id` → [sessions](sessions.md).session_id
* `thought_id` → `thought_quality_scores` (deprecated 2026-09-17).thought_id

# Attribution integrity

`thought_id` is the primary join key between thoughts and trades, but the
same id can be reused for a different trade (production has shown e.g. a META
trade joined to an NVDA thought). A pair is a valid learning/reporting sample
only when the surrounding metadata agrees — `symbol`, `llm_provider`,
`session_id` and `trade_mode` must match under `IS NOT DISTINCT FROM`
semantics (NULL vs NULL is consistent; NULL vs a value is a mismatch).
Consumers MUST exclude inconsistent pairs and report exclusion counts; they
must never fall back to `session_id`+`symbol` joins and must not treat
trades with no consistent thought as labelled samples. Enforced in magi-core
by `lib/learning-join.js` (`consistentThoughtJoinOn`) and
`optuna_utils.THOUGHT_JOIN_CONDITION` (magi-core#516).

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
