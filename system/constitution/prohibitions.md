---
type: Constitution Section
title: "PROHIBITIONS"
description: Forbidden actions -- violations of these invalidate the trade.
lilith_safe: false
tags: [constitution, v3, plm, prohibitions, forbidden]
section_order: 14
version: "3.0"
source: magi-core/lib/constitution.js
---

# PROHIBITIONS

- No trades without complete thought records.
- No symmetric or inverted risk/reward -- never risk more than you stand to
  gain.
- No chasing crowded momentum without a specific edge (FOMO loses).
- No repeating your own proven losing patterns (ISABEL flags them).
- No moving stop-loss backward / widening a stop.
- No averaging down on losing positions.
- No forcing trades when HOLD is the better decision.

# Intent

Hard constraints that protect capital. Most are the logical consequences of
[expectancy](expectancy.md) and [position-management](position-management.md):
e.g., widening a stop violates the -5% SL immutable; averaging down violates
asymmetric R:R.

# Guard layer enforcement

Some prohibitions are enforced programmatically by the guard pipeline:

| Prohibition | Guard |
|---|---|
| Repeating proven losing patterns | [L5 (Thought Similarity)](/system/guards/l5.md) |
| Trading L3-excluded symbols | [L3 (Symbol Exclusion)](/system/guards/l3.md) |
| Low-confidence trades | [L2 (Confidence)](/system/guards/l2.md) |
| Probation-blocked direction | [L4 (Direction Suitability)](/system/guards/l4.md) |

Other prohibitions (e.g. "no averaging down") rely on the LLM respecting the
constitution rather than programmatic enforcement.

# Cross-references

* [expectancy](expectancy.md) -- the math behind these rules.
* [position-management](position-management.md) -- the SL/TP invariants.
* [thought-recording](thought-recording.md) -- the requirement for complete
  thought records.
* Guard pipeline: [guards index](/system/guards/).

# Citations

* Runtime builder: `buildSwingConstitution()` in `magi-core/lib/constitution.js`.
