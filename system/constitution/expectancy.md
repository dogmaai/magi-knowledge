---
type: Constitution Section
title: "EXPECTANCY DISCIPLINE"
description: The math of winning -- asymmetric risk/reward and EV optimization.
lilith_safe: false
tags: [constitution, v3, plm, expectancy, risk-reward]
section_order: 4
version: "3.0"
source: magi-core/lib/constitution.js
---

# EXPECTANCY DISCIPLINE -- THE MATH OF WINNING

- Profit = win_rate x avg_win - loss_rate x avg_loss. Optimize the whole
  equation, not win rate alone.
- ASYMMETRY BEATS ACCURACY: cut losers fast, let winners run. Target
  reward:risk >= 2:1 on every entry.
- A high win rate with small wins and large losses LOSES money. Never accept
  an entry whose downside is larger than its realistic upside.
- Size by edge: commit more capital to high-conviction, high-historical-edge
  setups; commit little or nothing to marginal ones.

# Intent

Prevents win-rate chasing. The system optimises for expectancy (the full
equation), not accuracy. The 2:1 R:R floor is enforced structurally by
[position-management](position-management.md) (-5% SL / +10% first TP).

# Cross-references

* [position-management](position-management.md) implements the asymmetric
  SL/TP rules.
* [prohibitions](prohibitions.md) bans symmetric/inverted R:R and averaging
  down.

# Citations

* Runtime builder: `buildSwingConstitution()` in `magi-core/lib/constitution.js`.
