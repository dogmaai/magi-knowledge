---
type: PLM Unit
title: SOPHIA-5
description: RETIRED — hosted-Mistral strategist / golden-reasoning unit; the Mistral-family slot moved to local BOREAS.
lilith_safe: false
status: draft
generated: { by: devin/local, at: 2026-09-23T01:27:00Z }
verified: { by: human:jun, at: 2026-09-22T22:10:45Z }
stale_after: 2027-02-23T23:14:38Z
tags: [plm, retired, mistral]
provider: mistral
model: mistral-small-2603
unit_status: retired
budget_weight_normal: excluded
cloud_run_job: retired — magi-core-job + magi-scheduler-mistral removed from deploy.yml (magi-core#492); GCP resources deleted 2026-09-23 per Jun's instruction
---

# Overview

> **Retired (2026-09-22).** Jun decided to retire the hosted-Mistral unit
> because the Mistral-family trading slot moved to the self-hosted
> [BOREAS](boreas.md) unit (`ministral-3:14b` on TIALA via the `ollama`
> provider, zero API cost). The `mistral` provider joined
> `DEPRECATED_PROVIDERS` in `magi-core/lib/config.js` / `optuna_utils.py`,
> `mistral_NORMAL` (0.774) was removed from `BASE_BUDGET_WEIGHTS`, and the
> `magi-core-job` + `magi-scheduler-mistral` deploy steps left `deploy.yml`,
> and both GCP resources were deleted on 2026-09-23 (the scheduler had been
> PAUSED since retirement).

SOPHIA-5 was the **strategist** (戦略家) and the system's default unit:
`getUnitName()` returned `SOPHIA-5` for any provider not explicitly mapped,
`getLLMModel()` fell back to `mistral-small-2603`, and `getLLMProvider()`
defaulted to `mistral` — which also made it the implicit provider for every
auxiliary job without an explicit `LLM_PROVIDER` (daily-report, evaluator,
daphne, thought-outcome, health-monitor, off-hours-chat, isabel-cache, ...).

Succession on retirement:

| Former role | Successor |
|---|---|
| Scheduled PLM (golden reasoning) | [BOREAS](boreas.md) — local `ministral-3:14b` |
| Provider/unit/model defaults | `qwen` / [QWEN](qwen.md) / `qwen-plus` (Jun, 2026-09-22) |
| Surge detector `PRIMARY_JOB` | `magi-core-qwen` (QWEN) |
| Surge detector `SECONDARY_JOB` | `magi-core-boreas` (BOREAS) |
| Provider rosters | removed from `isabel/l4-batch.js` `PLM_PROVIDERS`, `health-monitor.js`, `off-hours-chat.mjs`, `isabel-cache.mjs` `ACTIVE_PROVIDERS` |

Historical rows in [trades](/system/echidna-tables/trades.md) /
[thoughts](/system/echidna-tables/thoughts.md) keep
`unit_name='SOPHIA-5'` / `llm_provider='mistral'`; the provider entry in
`src/llm.js` and `MISTRAL_API_KEY` remain for forensics but have no deployed
consumer.

# Citations

* `magi-core/lib/config.js` (`getLLMProvider` default `qwen`,
  `DEPRECATED_PROVIDERS`, removed `mistral_NORMAL`).
* `magi-core/surge-detector.js` (`PRIMARY_JOB=magi-core-qwen`,
  `SECONDARY_JOB=magi-core-boreas`).
* `magi-core/.github/workflows/deploy.yml` (job/scheduler steps removed).
