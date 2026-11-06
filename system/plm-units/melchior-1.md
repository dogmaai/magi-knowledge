---
type: PLM Unit
title: MELCHIOR-1
description: Systematic multi-factor analyst; runs HERMES intelligence collection.
lilith_safe: false
status: draft
generated: { by: process:codex, at: 2026-11-06T10:19:40Z }
verified: { by: human:jun, at: 2026-09-17T17:36:54Z }
stale_after: 2027-03-17T17:36:54Z
tags: [plm, shadow, google, gemini, hermes]
provider: google
model: gemini-3.8-flash
unit_status: shadow
budget_weight_normal: 0.954
cloud_run_job: magi-core-gemini
---

# Overview

> Revision note (2026-11-06): this documentary correction is not yet
> human-verified. The retained `verified` entry covers the earlier revision;
> `unit_status` remains `shadow`.

MELCHIOR-1 is a **systematic multi-factor analyst** — "your edge is thoroughness
and precision." It is the unit that triggers **HERMES intelligence collection**
(MELCHIOR-1-only) at the start of its cycle. As of #388, the live trading job
`magi-core-gemini` runs in `TRADE_MODE=SHADOW`: it continues to generate decisions
and refresh HERMES data, but orders are recorded to shadow tables rather than
submitted to the broker.

MELCHIOR-1 owns **logical / quantitative and generic pattern analysis**. It is
**not** the causal-analysis owner — that role belonged to the retired SEKHMET
analyzer (deprecated 2026-09-17) and is currently unassigned. See
[causal analysis ownership](index.md#causal-analysis-ownership).

# Configuration

| Field | Value |
|---|---|
| Provider | `google` |
| Model | `gemini-3.8-flash` (`GEMINI_MODEL` in the job; config fallback `gemini-3.8-flash`) |
| Budget weight (NORMAL) | `0.954` (Optuna: high; still used for shadow sizing) |
| Trade mode | `SHADOW` — records to `trades_shadow` / `thoughts_shadow`; no live broker orders |
| Cloud Run job | `magi-core-gemini` |
| HERMES model | `gemini-3.5-flash-lite` (`HERMES_GEMINI_MODEL`) |

Configuration reference: `magi-core` revision
`e991ce1db9a0c5043c26d19e0c407da3f6f4420d`, `lib/config.js`
(`getLLMModel('google')`) and `.github/workflows/deploy.yml`. Both specify
`gemini-3.8-flash`. This corrects the former fallback description; it is a
source/deploy-definition comparison, not a model switch or a check of the
running job.

# Relationships

* Writes/refreshes [market_research](/system/echidna-tables/market-research.md) via the HERMES stack.
* In-session fallback collector for `[HERMES:BRAVE]` (Brave Search → Gemini
  `HERMES_GEMINI_MODEL` → `pre_trade_intelligence`); the primary collector is the
  hourly `magi-hermes-refresh` job. See
  [HERMES intelligence stack](/system/services/magi-core.md#hermes-intelligence-stack).
* Gemini also powers the batch [gemini-pattern-analysis](/system/echidna-tables/gemini-pattern-analysis.md) report (`magi-gemini-analyzer`, Cloud Scheduler `magi-gemini-analyzer-daily`, `0 14 * * 1-5` UTC, AI Studio `gemini-3.8-flash`) — generic WIN/LOSE pattern extraction, not causal analysis.

# Trading history & performance

Query [trades](/system/echidna-tables/trades.md) where `unit_name='MELCHIOR-1'`.

# Citations

* `magi-core/src/session.js` (HERMES collection; persona).
* `magi-core/lib/config.js` (`GEMINI_MODEL` fallback).
* `magi-core/.github/workflows/deploy.yml` (`GEMINI_MODEL`,
  `HERMES_GEMINI_MODEL`, `TRADE_MODE=SHADOW`).
