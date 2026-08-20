---
type: BigQuery Table
title: daphne_feedback
description: DAPHNE loss-pattern (LP) classification of LOSE trades with a static causal/non-causal flag.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=daphne_feedback&page=table
lilith_safe: false
tags: [echidna, bigquery, daphne, causal, feedback]
dataset: magi_core
table_type: BASE TABLE
---

Output of `magi-daphne-analyzer` (`daphne-analyzer.js`, daily 22:00 ET
post-close). LOSE trades from the last 90 days are classified into the **LP
taxonomy in BigQuery SQL** (`REGEXP_CONTAINS`), aggregated per provider, and
flagged causal / non-causal from the **static `IS_CAUSAL` map** in the job — this
is rule-based classification, *not* LLM causal inference. LLM causal reasoning
belongs to [SEKHMET](/system/plm-units/sekhmet.md). Gemini (Vertex) is used only
to write the why-lost narrative and to rewrite ineffective hints.

# Schema

| Column | Type | Description |
|---|---|---|
| analyzed_at | TIMESTAMP | Run time. |
| llm_provider | STRING | Provider key the losses are attributed to. |
| lp_code | STRING | LP taxonomy code (e.g. `LP_VIX_REGIME_VIOLATION`, `LP_NO_CATALYST`, `LP_UNCLASSIFIED`). |
| count | INT64 | Losses matching this LP code. |
| total_loses | INT64 | Total losses for the provider in the window. |
| is_causal | BOOL | From the static `IS_CAUSAL` map (`LP_TIMING_MISS_REGIME_ALIGNED` is the non-causal case). |
| actionable_hint | STRING | Hint injected back into prompts; may be a Gemini-rewritten variant when the original tested INEFFECTIVE. |

# Related tables

* `daphne_loss_analysis` — per-provider why-lost narrative (`why_lost`, `do_differently`, `market_context`, `model`, `prompt_version`).
* `daphne_hint_effectiveness` — injected-vs-holdout A/B of each hint (`delta_pp`, `verdict`, `rewritten_hint`).

# Joins

* Derived from [trades](trades.md) (`result='LOSE'`) × [thoughts](thoughts.md).

# Citations

* Producer: `magi-core/daphne-analyzer.js`, `magi-core/lib/daphne-effectiveness.js`.
* DDL: `magi-core/sql/create_daphne_loss_analysis.sql`, `sql/create_daphne_hint_effectiveness.sql`.
