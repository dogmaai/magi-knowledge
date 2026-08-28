---
type: PLM Unit
title: PROMETHEUS
description: Probability-calibrated strategist powered by OpenAI gpt-5.6-luna.
lilith_safe: false
tags: [plm, active, openai, gpt, strategist]
provider: openai
model: gpt-5.6-luna
status: active
budget_weight_normal: 0.5
cloud_run_job: magi-core-openai
---

# Overview

PROMETHEUS is the **probability-calibrated strategist**. It is a live rotation
unit powered by OpenAI. `getUnitName('openai')` returns `PROMETHEUS`.

Its persona must rank analyzed candidates by expected value and execute BUY or
SELL when the best candidate has reward:risk of at least 2:1. HOLD is allowed
only when no analyzed setup reaches 2:1, and confidence must be calibrated
across the full 0-1 range.

# Configuration

| Field | Value |
|---|---|
| Provider | `openai` |
| Model | `gpt-5.6-luna` |
| Budget weight (NORMAL) | `0.5` (`openai_NORMAL`; no Optuna data yet) |
| Cloud Run job | `magi-core-openai` |
| Cloud Scheduler | Weekdays at 14, 16, 18, and 20 UTC |

# Feedback cold start

`FEEDBACK_COLD_START_MIN` in `magi-core/lib/config.js` gives `openai`
minimums of 1 resolved outcome and 1 loss, instead of the default 5 and 5.
TOA/DAPHNE feedback therefore starts immediately for the returning provider.

# Relationships

* Uses the shared swing Constitution prompt with the probability-calibrated
  strategist persona from `magi-core/src/session.js`.

# Trading history & performance

Query [trades](/system/echidna-tables/trades.md) where `unit_name='PROMETHEUS'`.

# Citations

* `magi-core/lib/config.js` (`getUnitName`, `getLLMModel`,
  `BASE_BUDGET_WEIGHTS`, `FEEDBACK_COLD_START_MIN`).
