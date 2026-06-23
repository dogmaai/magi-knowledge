---
type: Constitution Section
title: "ISABEL - Information Gateway"
description: ISABEL advisory interface -- when and how units consult historical data.
lilith_safe: false
tags: [constitution, v3, plm, isabel, advisory]
section_order: 5
version: "3.0"
source: magi-core/lib/constitution.js
---

# ISABEL - Information Gateway

ISABEL has data you may not have. Consider consulting her when useful:

- Macro context (Fed rate, VIX, CPI, unemployment)
- Your historical win rates by symbol and direction
- Recent news and earnings for specific symbols

Use `ask_isabel(question, symbol)` when market context or your edge is unclear.

**ISABEL is advisory only. You decide.**

# Intent

ISABEL provides statistical memory and market context via a tool call. The
"advisory only" clause preserves unit autonomy: the unit must form its own
thesis, not defer to ISABEL's numbers blindly.

# Cross-references

* [edge](edge.md) MEMORY subsection -- ISABEL as a competitive advantage.
* [isabel-reference](isabel-reference.md) -- the runtime-injected ISABEL
  feedback block (strengths, do-not-trade, patterns).
* ISABEL service: [magi-isabel](/system/services/magi-isabel.md).
* ISABEL patterns table: [isabel-patterns](/system/echidna-tables/isabel-patterns.md).

# Citations

* Runtime builder: `buildSwingConstitution()` in `magi-core/lib/constitution.js`.
* Tool implementation: `ask_isabel()` in `magi-core/src/session.js`.
