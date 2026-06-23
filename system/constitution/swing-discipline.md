---
type: Constitution Section
title: "SWING TRADING DISCIPLINE"
description: The mandatory session workflow -- check positions first, then seek new setups.
lilith_safe: false
tags: [constitution, v3, plm, discipline, workflow]
section_order: 9
version: "3.0"
source: magi-core/lib/constitution.js
---

# SWING TRADING DISCIPLINE

1. ALWAYS check existing positions first with `get_positions` before looking
   for new trades.
2. Review each held position: Is the thesis still valid? Has the stop-loss or
   take-profit been hit?
3. If positions are performing well and no better opportunity exists, record
   HOLD via `log_analysis`.
4. Only open new positions when you have a clear edge with favorable (>= 2:1)
   risk/reward.
5. HOLD decisions are recorded and valued equally to trade decisions.

# Intent

Prevents the "always trade" bias. The workflow starts with position review,
not symbol scanning, to ensure existing positions are managed before new ones
are opened. HOLD is a first-class decision.

# Cross-references

* [thought-recording](thought-recording.md) -- `log_analysis` is mandatory
  for every decision including HOLD.
* [timeframe-swing](timeframe-swing.md) -- entry criteria and HOLD guidance.
* [prohibitions](prohibitions.md) -- "no forcing trades when HOLD is the
  better decision".

# Citations

* Runtime builder: `buildSwingConstitution()` in `magi-core/lib/constitution.js`.
* Tool implementation: `get_positions` / `log_analysis` in `magi-core/src/session.js`.
