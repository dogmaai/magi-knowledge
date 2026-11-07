---
type: PLM Unit
title: CASPER
description: Aggressive momentum hunter — acts decisively on directional signals.
lilith_safe: false
status: stable
generated: { by: devin/cloud, at: 2026-11-07T09:16:00Z }
verified: [{ by: human:jun, at: 2026-09-22T01:45:00Z }, { by: human:jun, at: 2026-11-07T06:28:00Z }, { by: devin/cloud, at: 2026-11-07T09:16:00Z }, { by: human:jun, at: 2026-11-07T09:16:00Z }]
stale_after: 2027-05-07T09:16:00Z
tags: [plm, deepseek, momentum]
provider: deepseek
model: deepseek-flash
unit_status: active
budget_weight_normal: 0.999
cloud_run_job: magi-core-deepseek
---

# Overview

> Revision note (2026-11-07): the configured request ID moves from the
> retired `deepseek-v4-flash` alias to `deepseek-flash` (Jun's decision,
> [magi-core#706](https://github.com/dogmaai/magi-core/pull/706), merged and
> deployed 2026-11-07). Jun reviewed and approved this revision on 2026-11-07
> ([magi-knowledge#214](https://github.com/dogmaai/magi-knowledge/pull/214)
> review). `unit_status` remains `active`.

CASPER is the **aggressive momentum hunter**: "Your edge is catching strong
directional moves early. You ACT on signals. Hesitation = missed profit. You are
NOT a risk manager — the system handles risk." It buys uptrends / sells
downtrends, favouring high-momentum names, and carries the highest budget weight.

# Configuration

| Field | Value |
|---|---|
| Provider | `deepseek` |
| Model | `deepseek-flash` (configured request ID since [magi-core#706](https://github.com/dogmaai/magi-core/pull/706); before it, the retired `deepseek-v4-flash` alias) |
| Served model in provider documentation | `DeepSeek-V4.1-Flash-1017` (checked 2026-11-07; not a MAGI runtime observation) |
| API-reported served model | `deepseek-flash` on every CASPER LLM decision row in `thoughts.model_version`. Recording for CASPER starts 2026-10-08 — the start of recording, not a switch date (see below) |
| Budget weight (NORMAL) | `0.999` (Optuna: highest) |
| Trade mode | `LIVE` — real broker orders (promoted from SHADOW on 2026-09-22) |
| Cloud Run job | `magi-core-deepseek` |

# Provider model lifecycle

The `model` frontmatter and registry row identify the configured request ID.
[magi-core#706](https://github.com/dogmaai/magi-core/pull/706) sets
`getLLMModel('deepseek')` in `lib/config.js` to `deepseek-flash` and makes
`src/llm.js` resolve every provider's model through `getLLMModel()` (no
hard-coded IDs, magi-core#641). Merged as magi-core
`f811baa3b6949867c63e9a59d72f64be7ab29647` on 2026-11-07 16:05 JST; the
same-day *Deploy to Cloud Run* run on that commit succeeded, so
`magi-core-deepseek` now sends `deepseek-flash`. `health-monitor.js` and
`off-hours-chat.mjs` also take the ID from `getLLMModel()`.

The switch is expected not to change the served model. DeepSeek's model
details (checked 2026-11-07) list both IDs as served by
`DeepSeek-V4.1-Flash-1017`, and the API-reported `model` that magi-core
records in [thoughts](/system/echidna-tables/thoughts.md).`model_version`
has been `deepseek-flash` on every CASPER LLM decision row recorded so far.
This is a provider-documentation and recorded-response comparison, not an
authenticated probe of both IDs.

The 34 CASPER `thoughts` rows with `model_version='deepseek-v4-flash'`
(2026-10-08 – 10-31 JST) are all `action='WARN_ONLY'` guard rows, not LLM
decisions: `magi-core/src/guard.js` (line 49 at `f811baa`) writes
`getLastServedModel() || getLLMModel(provider)`, so a guard row written
before any served model is known falls back to the configured ID.

DeepSeek's [2026-09-10 release notice](https://api-docs.deepseek.com/updates/#date-2026-09-10)
states that V4 Flash was retired and its legacy request ID temporarily routes
to V4.1 Flash. The [2026-10-17 update](https://api-docs.deepseek.com/updates/#date-2026-10-17) and
[current model details](https://api-docs.deepseek.com/quick_start/pricing/),
checked on 2026-11-06, identify the served version as
`DeepSeek-V4.1-Flash-1017` and recommend `deepseek-flash`. No final acceptance
deadline for `deepseek-v4-flash` is specified in these sources.

`deepseek-flash` tracks DeepSeek's latest Flash model, so provider-side
upgrades still arrive silently (as with the 2026-10-17 update, which left the
reported name unchanged). When the served name changed is **unknown**:
`model_version` began to be written for all units on 2026-10-05 – 10-06, and
CASPER has no `thoughts` rows from 2026-10-04 to 10-07, so its first recorded
row (2026-10-08) is only the start of recording, not the switch date.

**Model changes do not split CASPER's cohort (Jun 2026-11-07).** CASPER's
results are evaluated continuously by `unit_name`, across this ID switch and
earlier provider-side model updates. This overrides, for now, the cohort-boundary
rule of the `draft` [model-cohorting proposal](/system/constitution/model-cohorting.md).
No historical row is relabelled. CASPER's post-2026-09-10 trade sample is
small (12 `trades` rows by 2026-11-07).

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
