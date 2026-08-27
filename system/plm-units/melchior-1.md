---
type: PLM Unit
title: MELCHIOR-1
description: Systematic multi-factor analyst; runs HERMES intelligence collection.
lilith_safe: false
tags: [plm, shadow, google, gemini, hermes]
provider: google
model: gemini-2.5-flash
status: shadow
budget_weight_normal: 0.954
cloud_run_job: magi-core-gemini
---

# Overview

MELCHIOR-1 is a **systematic multi-factor analyst** — "your edge is thoroughness
and precision." It is the unit that triggers **HERMES intelligence collection**
(MELCHIOR-1-only) at the start of its cycle. As of #388, the live trading job
`magi-core-gemini` runs in `TRADE_MODE=SHADOW`: it continues to generate decisions
and refresh HERMES data, but orders are recorded to shadow tables rather than
submitted to the broker.

MELCHIOR-1 owns **logical / quantitative and generic pattern analysis**. It is
**not** the causal-analysis owner — causal analysis belongs to
[SEKHMET](sekhmet.md) (Sakana `fugu-ultra`, `magi-fugu-analyzer`). See
[causal analysis ownership](index.md#causal-analysis-ownership).

# Configuration

| Field | Value |
|---|---|
| Provider | `google` |
| Model | `gemini-2.5-flash` (override via `GEMINI_MODEL`) |
| Budget weight (NORMAL) | `0.954` (Optuna: high; still used for shadow sizing) |
| Trade mode | `SHADOW` — records to `trades_shadow` / `thoughts_shadow`; no live broker orders |
| Cloud Run job | `magi-core-gemini` |

# Relationships

* Writes/refreshes [market_research](/system/echidna-tables/market-research.md) via the HERMES stack.
* Gemini also powers the batch [gemini-pattern-analysis](/system/echidna-tables/gemini-pattern-analysis.md) report (`magi-gemini-analyzer`, Cloud Scheduler `magi-gemini-analyzer-daily`, `0 14 * * 1-5` UTC, Vertex `gemini-3-flash-preview`) — generic WIN/LOSE pattern extraction, not causal analysis.

# Trading history & performance

Query [trades](/system/echidna-tables/trades.md) where `unit_name='MELCHIOR-1'`.

# Citations

* `magi-core/src/session.js` (HERMES collection; persona).
* `magi-core/lib/config.js`.
