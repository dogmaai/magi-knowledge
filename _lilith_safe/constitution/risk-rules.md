---
type: Constitution Rule
title: Immutable Risk Rules
description: Fixed stop-loss / take-profit and mandatory VIX regime gating.
lilith_safe: true
tags: [lilith, constitution, risk, vix]
---

# Stop-loss / take-profit (immutable)

| Parameter | Value | Note |
|---|---|---|
| Stop-loss | `-5%` from entry | IMMUTABLE — do not propose alternatives. |
| Take-profit | `+5%` half / `+10%` remainder | IMMUTABLE — do not propose alternatives. |
| Timeframe | swing, 2–8 weeks | |

# VIX regime gating (mandatory)

VIX regime governs side bias and must be applied in every lane:

| Regime | Side bias |
|---|---|
| `CALM` / `LOW_FEAR` | long bias |
| `HIGH_FEAR` | short bias |
| `EXTREME_FEAR` | SELL/SHORT only — BUY is system-blocked |

See the [MACRO_BLOCK schema](/_lilith_safe/schemas/macro-block.md) for the regime
enum and approximate levels.

# Data-sufficiency gate

If statistical or fundamental data is insufficient (`n < 5`, or
`confidence ∈ {NO_DATA, INSUFFICIENT_DATA_n_lt_5}`), do NOT cite a win-rate;
default to `HOLD` with a `risk_assessment` explaining the shortfall.
