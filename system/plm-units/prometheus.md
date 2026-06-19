---
type: PLM Unit
title: PROMETHEUS
description: GPT auxiliary / backup unit (OpenAI gpt-4o-mini).
lilith_safe: false
tags: [plm, auxiliary, openai, gpt]
provider: openai
model: gpt-4o-mini
status: active
budget_weight_normal: null
---

# Overview

PROMETHEUS is the **OpenAI / GPT** unit. `getUnitName('openai')` returns
`PROMETHEUS`. It has no entry in the default `BUDGET_WEIGHTS` map, so it is not
part of the standard weighted rotation — it functions as an auxiliary / backup
unit and a GPT cross-check rather than a primary allocation.

# Configuration

| Field | Value |
|---|---|
| Provider | `openai` |
| Model | `gpt-4o-mini` |
| Budget weight (NORMAL) | none (auxiliary; no `openai_NORMAL` key) |

# Trading history & performance

Query [trades](/system/echidna-tables/trades.md) where `unit_name='PROMETHEUS'`.

# Citations

* `magi-core/lib/config.js` (`getUnitName`, `getLLMModel`; absent from `BUDGET_WEIGHTS`).
