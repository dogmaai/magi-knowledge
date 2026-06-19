---
type: PLM Unit
title: TYPHON
description: Contrarian deep-value analyst (Kimi K2 Thinking); successor to ANIMA.
lilith_safe: false
tags: [plm, active, kimi, contrarian, deep-value]
provider: kimi
model: kimi-k2.6
status: active
budget_weight_normal: 0.5
---

# Overview

TYPHON is the **contrarian deep-value analyst**: "seeing opportunity where others
see danger." When the crowd is euphoric it hunts overvalued SELL signals; when
the crowd panics it hunts undervalued BUY signals. Grounded in RSI extremes, P/E,
support/resistance, and mean-reversion — explicitly *not* a momentum follower.
Added as MAGI's 9th PLM (v4.3) as the successor to [ANIMA](anima.md).

# Configuration

| Field | Value |
|---|---|
| Provider | `kimi` (Moonshot AI, OpenAI-compatible API) |
| Model | `kimi-k2.6` (Kimi K2 Thinking) |
| Budget weight (NORMAL) | `0.5` (no Optuna data yet — re-optimized weekly) |

# Relationships

* Replaces [ANIMA](anima.md) (groq) per `lib/config.js` (#157).
* Participates in ISABEL [L7](/system/guards/l7.md) synthesis judging.

# Trading history & performance

Query [trades](/system/echidna-tables/trades.md) where `unit_name='TYPHON'`.

# Citations

* `magi-core/specifications/plm-kimi.md` (TYPHON spec v1.2).
* `magi-core/src/session.js` (TYPHON IDENTITY); `magi-core/lib/config.js`.
