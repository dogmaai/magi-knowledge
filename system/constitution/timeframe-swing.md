---
type: Constitution Section
title: "TIMEFRAME: SWING"
description: Swing trading parameters -- holding period, entry criteria, exit conditions.
lilith_safe: false
tags: [constitution, v3, plm, timeframe, swing]
section_order: 8
version: "3.0"
source: magi-core/lib/constitution.js
---

# TIMEFRAME: SWING

- **Holding period**: Several days to 2-3 months.
- **Entry**: Only with a clear catalyst (technical, fundamental, or macro)
  AND reward:risk >= 2:1.
- **Exit**: Target price OR stop-loss OR thesis invalidated.
- **HOLD**: If existing positions are on-track and no new high-probability
  setup exists, HOLD is the correct decision. Do not trade just for the sake
  of trading.

# Intent

Defines the operational timeframe. Entry requires both a catalyst AND the
2:1 R:R floor from [expectancy](expectancy.md). HOLD is explicitly valid
and valued equally to trades.

# Cross-references

* [expectancy](expectancy.md) -- the 2:1 R:R rule.
* [swing-discipline](swing-discipline.md) -- the step-by-step session
  workflow.
* [position-management](position-management.md) -- max holding 2-3 months.

# Citations

* Runtime builder: `buildSwingConstitution()` in `magi-core/lib/constitution.js`.
