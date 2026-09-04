---
type: PLM Unit
title: SOPHIA-5
description: The strategist / golden-reasoning unit; also the default fallback unit.
lilith_safe: false
tags: [plm, active, mistral]
provider: mistral
model: mistral-small-2603
status: active
budget_weight_normal: 0.774
cloud_run_job: magi-core-job
---

# Overview

SOPHIA-5 is the **strategist** (戦略家) and the system's default unit:
`getUnitName()` returns `SOPHIA-5` for any provider not explicitly mapped, and
`getLLMModel()` falls back to `mistral-small-2603`. It runs the primary
"golden reasoning" job and is the first responder for the surge detector.

# Configuration

| Field | Value |
|---|---|
| Provider | `mistral` |
| Model | `mistral-small-2603` (`MISTRAL_MODEL` override and fallback) |
| Budget weight (NORMAL) | `0.774` (Optuna: mid-high) |
| Cloud Run job | `magi-core-job` (PRIMARY_JOB in `surge-detector.js`) |

# Relationships

* [Surge detector](/system/services/magi-core.md#surge-detector) escalates to
  [CASPER](casper.md) (`magi-core-deepseek`) for a second opinion.
* Shares the swing Constitution prompt (`buildSwingConstitution`) with all units.

# Trading history & performance

Query [trades](/system/echidna-tables/trades.md) /
[sessions](/system/echidna-tables/sessions.md) filtered by `unit_name='SOPHIA-5'`.

# Citations

* `magi-core/lib/config.js` (`getUnitName`, `getLLMModel`, `BUDGET_WEIGHTS`,
  `MISTRAL_MODEL`).
* `magi-core/surge-detector.js` (PRIMARY_JOB).
