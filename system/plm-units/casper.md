---
type: PLM Unit
title: CASPER
description: Aggressive momentum hunter — acts decisively on directional signals.
lilith_safe: false
status: draft
generated: { by: devin/local, at: 2026-09-22T01:30:00Z }
verified: { by: human:jun, at: 2026-08-27T23:14:38Z }
stale_after: 2027-02-23T23:14:38Z
tags: [plm, deepseek, momentum]
provider: deepseek
model: deepseek-v4-flash
unit_status: active
budget_weight_normal: 0.999
cloud_run_job: magi-core-deepseek
---

# Overview

CASPER is the **aggressive momentum hunter**: "Your edge is catching strong
directional moves early. You ACT on signals. Hesitation = missed profit. You are
NOT a risk manager — the system handles risk." It buys uptrends / sells
downtrends, favouring high-momentum names, and carries the highest budget weight.

# Configuration

| Field | Value |
|---|---|
| Provider | `deepseek` |
| Model | `deepseek-v4-flash` |
| Budget weight (NORMAL) | `0.999` (Optuna: highest) |
| Trade mode | `LIVE` — real broker orders (promoted from SHADOW on 2026-09-22) |
| Cloud Run job | `magi-core-deepseek` |

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
