---
type: PLM Unit
title: CASPER
description: Aggressive momentum hunter — acts decisively on directional signals.
lilith_safe: false
tags: [plm, shadow, deepseek, momentum]
provider: deepseek
model: deepseek-v4-flash
status: shadow
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
| Budget weight (NORMAL) | `0.999` (Optuna: highest; still used for shadow sizing) |
| Trade mode | `SHADOW` — records to `trades_shadow` / `thoughts_shadow`; no live broker orders |
| Cloud Run job | `magi-core-deepseek` |

# Behaviour notes

* RSI < 30 with recovering trend → strong BUY; RSI > 70 breaking down → strong SELL.
* As of #388, `magi-core-deepseek` runs with `TRADE_MODE=SHADOW`: decisions are
  logged to shadow tables but are not sent to the broker.
* Risk is delegated to the [guard layers](/system/guards/), not to CASPER itself.

# Trading history & performance

Query [trades](/system/echidna-tables/trades.md) where `unit_name='CASPER'`.

# Citations

* `magi-core/src/session.js` (CASPER IDENTITY).
* `magi-core/lib/config.js`.
