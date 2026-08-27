---
type: Constitution Section
title: "POSITION MANAGEMENT"
description: Asymmetric risk/reward rules -- sizing, SL/TP, scale-out, and max holding.
lilith_safe: false
tags: [constitution, v3, plm, position, risk, sl, tp, immutable]
section_order: 13
version: "3.8"
source: magi-core/lib/constitution.js
---

# POSITION MANAGEMENT -- ASYMMETRIC RISK/REWARD

| Parameter | Value | Mutable? |
|---|---|---|
| Max per symbol | 15% of total capital | yes |
| Max concurrent | 8 symbols | yes |
| Stop-loss | -5% from entry (hard floor; NEVER widen) | **IMMUTABLE** |
| Short stop-loss | -3.5% from entry (`STOP_LOSS_PCT * 0.7`, default -3.5%) | yes |
| Short entry sizing | Exposure-increasing SELLs sized at `0.7x` (`SHORT_SIZE_MULT`) | yes |
| First scale-out | +10%, sell half to lock partial gains | yes |
| Breakeven protection | After scaling, exit at breakeven if it falls back to entry | yes |
| Final take-profit | +20% (or exit when thesis is exhausted) | yes |
| Max holding | 2-3 months | yes |

**Do NOT take profit at +5%** -- that caps winners and destroys expectancy.

# Intent

Enforces the asymmetric payoff profile: losses are hard-capped at -5%, winners
run to +10%/+20%. This structure delivers the >= 2:1 R:R required by
[expectancy](expectancy.md).

The -5% SL is the single most critical immutable parameter. Widening the stop
is a [prohibited action](prohibitions.md).

Short positions are treated asymmetrically: exposure-increasing SELLs are sized
at `0.7x` (`SHORT_SIZE_MULT`) and the short stop-loss is tightened to `-3.5%`
(`STOP_LOSS_PCT * SHORT_SL_TIGHTEN 0.7`) because measured short-side outcomes are
weaker.

# Relationship to LILITH-safe risk-rules

The LILITH-safe [risk-rules](/_lilith_safe/constitution/risk-rules.md) mirrors
the SL/TP invariant but uses the simpler "+5% half / +10% remainder" framing
(the original Constitution v2.0 values). The v3.x PLM versions raise the TP
targets to +10%/+20% for the full-system units.

# Cross-references

* Guard layer: [L1.5](/system/guards/l1-5.md) -- enforces max concurrent
  positions and max position %.
* LILITH-safe: [risk-rules](/_lilith_safe/constitution/risk-rules.md).
* Runtime enforcement: `magi-core/src/positionMgmt.js` /
  `magi-core/positionManager.js`.

# Citations

* Runtime builder: `buildSwingConstitution()` in `magi-core/lib/constitution.js`.
* Position manager: `magi-core/src/positionMgmt.js`.
