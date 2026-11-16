---
type: PLM Unit
title: MELCHIOR-1
description: Systematic multi-factor analyst; runs HERMES intelligence collection.
lilith_safe: false
status: stable
generated: { by: claude/opus-5-5, at: 2026-11-07T04:33:35Z }
verified: [{ by: human:jun, at: 2026-09-17T17:36:54Z }, { by: human:jun, at: 2026-11-07T05:51:00Z }]
stale_after: 2027-05-07T05:51:00Z
tags: [plm, shadow, google, gemini, hermes]
provider: google
model: gemini-3.8-flash
unit_status: shadow
budget_weight_normal: 0.954
cloud_run_job: magi-core-gemini
---

# Overview

> Revision notes: 2026-11-06 — fallback-model correction; 2026-11-07 —
> SHADOW write paths split into analysis vs. order rows (see *Trade mode*
> below). Jun reviewed both revisions on 2026-11-07 (Claude session) and
> restored `stable`; `unit_status` remains `shadow`.

MELCHIOR-1 is a **systematic multi-factor analyst** — "your edge is thoroughness
and precision." It is the unit that triggers **HERMES intelligence collection**
(MELCHIOR-1-only) at the start of its cycle. As of #388, the live trading job
`magi-core-gemini` runs in `TRADE_MODE=SHADOW`: it continues to generate decisions
and refresh HERMES data, but its orders are recorded to the shadow ledgers
rather than submitted to the broker. Its analysis rows stay in `thoughts`
(see [SHADOW write paths](#shadow-write-paths)).

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
| Trade mode | `SHADOW` — no live broker orders; analysis rows → `thoughts` (`trade_mode='SHADOW'`), order decisions → `trades_shadow` / `thoughts_shadow`. See [SHADOW write paths](#shadow-write-paths). |
| Cloud Run job | `magi-core-gemini` |
| HERMES model | `gemini-3.5-flash-lite` (`HERMES_GEMINI_MODEL`) |

Configuration reference: `magi-core` revision
`e991ce1db9a0c5043c26d19e0c407da3f6f4420d`,
[lib/config.js](https://github.com/dogmaai/magi-core/blob/e991ce1db9a0c5043c26d19e0c407da3f6f4420d/lib/config.js)
(`getLLMModel('google')`) and
[.github/workflows/deploy.yml](https://github.com/dogmaai/magi-core/blob/e991ce1db9a0c5043c26d19e0c407da3f6f4420d/.github/workflows/deploy.yml). Both specify
`gemini-3.8-flash`. This corrects the former fallback description; it is a
source/deploy-definition comparison, not a model switch or a check of the
running job.

# SHADOW write paths

Under `TRADE_MODE=SHADOW` a decision is written in two places, depending on
which tool the unit calls (magi-core `e991ce1db9a0c5043c26d19e0c407da3f6f4420d`,
`src/llm.js`):

| Tool call | Destination | `trade_mode` |
|---|---|---|
| `log_analysis` — every analysed symbol, including `HOLD` | [thoughts](/system/echidna-tables/thoughts.md) | `SHADOW` |
| `place_order` — `BUY` / `SELL` with `qty > 0` | [trades_shadow](/system/echidna-tables/trades-shadow.md) + [thoughts_shadow](/system/echidna-tables/thoughts-shadow.md) (`broker='shadow'`, no broker call) | `SHADOW` |

The shadow rows reuse the analysis row's `thought_id`, so a shadow order joins
back to its `thoughts` row. A session that only produces `HOLD` writes nothing
to the shadow ledgers (e.g. 2026-11-06: 11 `SHADOW` analysis rows in
`thoughts`, no shadow-ledger row). Live-performance reads exclude these rows
through `thoughts_active` (`trade_mode = 'NORMAL'`).

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
* `magi-core/src/llm.js` (`log_analysis` → `thoughts`; SHADOW `place_order` → `trades_shadow` / `thoughts_shadow`) and `magi-core/lib/shadow-trade.js` (`buildShadowDecisionRows`).
* `magi-core/.github/workflows/deploy.yml` (`GEMINI_MODEL`,
  `HERMES_GEMINI_MODEL`, `TRADE_MODE=SHADOW`).
