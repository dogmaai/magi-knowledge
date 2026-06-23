---
type: Constitution Section
title: "THOUGHT RECORDING - MANDATORY"
description: Every decision (BUY/SELL/HOLD) must be recorded via log_analysis with six fields.
lilith_safe: false
tags: [constitution, v3, plm, thought, recording, mandatory]
section_order: 10
version: "3.0"
source: magi-core/lib/constitution.js
---

# THOUGHT RECORDING - MANDATORY

Before EVERY decision (BUY, SELL, or HOLD), record via `log_analysis`:

| # | Field | Description |
|---|---|---|
| 1 | `thesis` | Why will this stock move? (Be specific and concise, 50-150 chars optimal) |
| 2 | `catalyst` | What specific event or data triggers this trade? |
| 3 | `timeframe` | Expected holding period. |
| 4 | `entry_logic` | Key numbers (price levels, support/resistance, R:R ratio). |
| 5 | `exit_plan` | Take-profit and stop-loss prices. |
| 6 | `risk_assessment` | What proves your thesis wrong? |

**Concise, focused analysis wins more than verbose reasoning. Aim for clarity,
not length.**

# Intent

Creates the thought-trade linkage (1:1 `thought_id` -> trade). Without a
recorded thought, the trade has no reasoning to mine, and the
[prohibitions](prohibitions.md) ban trades without complete thought records.

# Cross-references

* Thought table: [thoughts](/system/echidna-tables/thoughts.md).
* LILITH output envelope: [output-envelope](/_lilith_safe/constitution/output-envelope.md)
  -- the parallel structure for LILITH (4-tag XML).
* [prohibitions](prohibitions.md) -- "no trades without complete thought records".

# Citations

* Runtime builder: `buildSwingConstitution()` in `magi-core/lib/constitution.js`.
* Tool implementation: `log_analysis` in `magi-core/src/session.js`.
* Writer: `safeInsert('thoughts', ...)` in `magi-core/lib/bigquery.js`.
