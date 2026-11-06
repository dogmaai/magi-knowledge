---
type: PLM Unit
title: CASPER
description: Aggressive momentum hunter — acts decisively on directional signals.
lilith_safe: false
status: draft
generated: { by: process:codex, at: 2026-11-06T10:19:40Z }
verified: { by: human:jun, at: 2026-09-22T01:45:00Z }
stale_after: 2027-02-23T23:14:38Z
tags: [plm, deepseek, momentum]
provider: deepseek
model: deepseek-v4-flash
unit_status: active
budget_weight_normal: 0.999
cloud_run_job: magi-core-deepseek
---

# Overview

> Revision note (2026-11-06): this documentary update is not yet human-verified.
> The retained `verified` entry covers the earlier revision; `unit_status`
> remains `active`.

CASPER is the **aggressive momentum hunter**: "Your edge is catching strong
directional moves early. You ACT on signals. Hesitation = missed profit. You are
NOT a risk manager — the system handles risk." It buys uptrends / sells
downtrends, favouring high-momentum names, and carries the highest budget weight.

# Configuration

| Field | Value |
|---|---|
| Provider | `deepseek` |
| Configured API model ID | `deepseek-v4-flash` (legacy alias, still accepted according to provider documentation) |
| Served model in provider documentation | `DeepSeek-V4.1-Flash-1017` (checked 2026-11-06; not a MAGI runtime observation) |
| Provider-recommended request ID | `deepseek-flash` |
| Budget weight (NORMAL) | `0.999` (Optuna: highest) |
| Trade mode | `LIVE` — real broker orders (promoted from SHADOW on 2026-09-22) |
| Cloud Run job | `magi-core-deepseek` |

# Provider model lifecycle

The `model` frontmatter and registry row identify the configured request ID.
At `magi-core` revision `e991ce1db9a0c5043c26d19e0c407da3f6f4420d`,
`lib/config.js` (`getLLMModel`) and `src/llm.js` still specify
`deepseek-v4-flash`. The provider-recommended ID above records migration
guidance, not an implemented MAGI configuration change.

DeepSeek's [2026-09-10 release notice](https://api-docs.deepseek.com/updates/)
states that V4 Flash was retired and its legacy request ID temporarily routes
to V4.1 Flash. The 2026-10-17 update and
[current model details](https://api-docs.deepseek.com/quick_start/pricing/),
checked on 2026-11-06, identify the served version as
`DeepSeek-V4.1-Flash-1017` and recommend `deepseek-flash`. No final acceptance
deadline for `deepseek-v4-flash` is specified in these sources.

These are provider documentation observations, not authenticated API probes
or verification of MAGI's deployed responses. The first MAGI request served
by the replacement model has not been established. The
[model-cohorting proposal](/system/constitution/model-cohorting.md) is itself
`draft`; this record does not establish a runtime cohort reset or relabel
historical results as belonging to the replacement model.

# Behaviour notes

* RSI < 30 with recovering trend → strong BUY; RSI > 70 breaking down → strong SELL.
* `magi-core-deepseek` ran with `TRADE_MODE=SHADOW` from #388 until
  2026-09-22, when Jun promoted it back to LIVE.
* The [surge detector](/system/services/magi-core.md#surge-detector) uses CASPER as the second opinion after
  [SOPHIA-5](sophia-5.md) (`SECONDARY_JOB =
  'magi-core-deepseek'`).
* Risk is delegated to the [guard layers](/system/guards/), not to CASPER itself.

# Trading history & performance

Query [trades](/system/echidna-tables/trades.md) where `unit_name='CASPER'`.

# Citations

* `magi-core/src/session.js` (CASPER IDENTITY).
* `magi-core/lib/config.js`.
