---
type: PLM Unit
title: QWEN
description: DashScope systematic independent reasoner using qwen-plus.
lilith_safe: false
tags: [plm, active, qwen, dashscope, independent, turtle]
provider: qwen
model: qwen-plus
status: active
budget_weight_normal: 0.5
cloud_run_job: magi-core-qwen
---

# Overview

`getUnitName('qwen')` returns `QWEN`, deliberately not LILITH, so this provider
does not collide with the Ollama-based [ADAM](adam.md) unit. QWEN uses the
DashScope `qwen-plus` model.

# Configuration

| Field | Value |
|---|---|
| Provider | `qwen` (DashScope) |
| Model | `qwen-plus` |
| Budget weight (NORMAL) | `0.5` base; `0.75` effective with `UNIT_WEIGHT_MULTIPLIERS['qwen_NORMAL'] = 1.5` |
| Cloud Run job | `magi-core-qwen` |

# Relationships

The `qwen` branch in `magi-core/src/session.js` uses
`buildSwingConstitution() + ADAM_IDENTITY + RICHARD_DENNIS_IDENTITY`.
`ADAM_IDENTITY` makes QWEN an independent reasoner: decide only from raw
market data, never other units' processed intelligence, and keep reasoning to
50-150 characters.

`RICHARD_DENNIS_IDENTITY` adds the systematic Turtle rules: 20-day breakout
entries, ATR-based sizing and stops, taking every valid breakout, and citing
the breakout level, ATR, entry, stop, and size. This QWEN provider path is
separate from [LILITH](lilith.md), the fine-tuned `lilith` provider.

# Citations

* `magi-core/src/session.js` (QWEN provider dispatch).
* `magi-core/lib/constitution.js` (`ADAM_IDENTITY`,
  `RICHARD_DENNIS_IDENTITY`).
* `magi-core/lib/config.js` (`getUnitName`, budget weights).
