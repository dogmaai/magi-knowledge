---
type: Constitution Section
title: "MARKET REGIME AWARENESS - VIX"
description: VIX-based size and selectivity adjustment -- direction comes from edge, not VIX; bands match the L6 regime enum, and L6 hard-blocks risk-increasing BUYs at VIX >= 25.
lilith_safe: false
status: draft
generated: { by: devin/local, at: 2026-10-12T00:30:00Z }
verified: { by: human:jun, at: 2026-06-23T01:27:14Z }
stale_after: 2026-12-20T01:27:14Z
tags: [constitution, v3, plm, vix, regime, risk]
section_order: 6
version: "3.0"
source: magi-core/lib/constitution.js
---

# MARKET REGIME AWARENESS - VIX

VIX adjusts your SIZE and SELECTIVITY, not your direction. Do NOT short merely
because VIX is high, or go long merely because VIX is low -- direction comes
from your edge, not from VIX. The one exception is the system-enforced
`EXTREME_FEAR` / `PANIC` side restriction below, which is a risk control, not
a directional call.

The bands are the same five regimes `magi-core/lib/vix.js` classifies and
[L6](/system/guards/l6.md) enforces, so the prompt never promises a trade the
guard will refuse:

| VIX level | Regime | Guidance | L6 |
|---|---|---|---|
| < 15 | `CALM` | Trends tend to persist; standard size; trade on merit. | pass |
| 15 to < 20 | `LOW_FEAR` | Standard size; trade either direction on its own merit. | pass |
| 20 to < 25 | `HIGH_FEAR` | Reduce size (0.7x cap); demand stronger confirmation; both directions allowed. | warn on BUY |
| 25 to < 30 | `EXTREME_FEAR` | Minimum size (0.3x cap). Risk-increasing BUYs are system-blocked; SELL/SHORT or short-cover BUYs only. | block risk-increasing BUY |
| >= 30 | `PANIC` | Minimum size (0.3x cap) or stay in cash; capital preservation first. Same BUY block as `EXTREME_FEAR`. | block risk-increasing BUY |

Boundaries are lower-inclusive (`classifyVixRegime` uses `<` against each
`*_MAX`), so VIX exactly 25.0 is `EXTREME_FEAR` and the BUY block applies.

Use `get_price` with symbol "UVXY" or "VIX" proxy to gauge market fear.

## Legacy enum mapping

The pre-v2 enum had a `NORMAL` band at 15-20 and placed the block point at
VIX ~30 (thresholds 30/40). The v2 migration (MAGI-GE-DESIGN-001-v2 §5.2)
renamed that band `LOW_FEAR` and moved the block to 25. The LILITH-safe
[MACRO_BLOCK schema](/_lilith_safe/schemas/macro-block.md) is retained as the
historical boundary specification and still lists `NORMAL`; when reconciling
the two, read legacy `NORMAL` as today's `LOW_FEAR`. The runtime
(`magi-core/lib/vix.js`) emits only the five labels above.

# Intent

VIX governs position sizing and conviction threshold, **not trade direction**,
in the `CALM` / `LOW_FEAR` / `HIGH_FEAR` regimes: units keep directional
autonomy there and only the size cap tightens
([L1.5](/system/guards/l1-5.md) multiplies `MAX_POSITION_PCT` by the regime
multiplier).

At `EXTREME_FEAR` / `PANIC` the LILITH-safe
[risk-rules](/_lilith_safe/constitution/risk-rules.md) side restriction
(`EXTREME_FEAR` is SELL/SHORT only, BUY system-blocked) applies to the
standard PLM lane as well — Jun decided to tighten L6 from warn-only to a
hard block on 2026-09-21 (option A, recorded in [l6.md](/system/guards/l6.md)).
The prompt therefore tells units up front that risk-increasing BUYs will be
refused in those regimes instead of inviting a trade the guard rejects.
Short-cover BUYs stay allowed so positions remain unwindable.

Earlier revisions of this section used four bands (`< 15` / `15-25` / `25-35`
/ `> 35`) that did not line up with the five-level enum and described
`25-35` as "both directions allowed" while L6 blocked BUYs from 25 — that
drift was aligned on 2026-10-12 (magi-core `lib/constitution.js` updated in
the linked PR). The option-A decision date (2026-09-21) precedes `l6.md`'s
`generated` (2026-09-23) and both of its `human:jun` verifications
(2026-09-22, 2026-10-06), so the verified `l6.md` text already reflects it. Whether the block threshold itself should move is a separate
risk-policy decision for Jun; this doc records the current rule.

# Cross-references

* Guard layer: [L6 (Market Regime)](/system/guards/l6.md) -- hard-blocks
  risk-increasing BUYs in `EXTREME_FEAR` / `PANIC`; warn-only in `HIGH_FEAR`.
* Sizing: [L1.5](/system/guards/l1-5.md) -- per-regime position multiplier
  (`CALM`/`LOW_FEAR` 1.0, `HIGH_FEAR` 0.7, `EXTREME_FEAR`/`PANIC` 0.3).
* LILITH-safe version: [risk-rules](/_lilith_safe/constitution/risk-rules.md)
  -- side-bias mapping that L6 enforces at `EXTREME_FEAR`.
* VIX detection and regime enum: `magi-core/lib/vix.js`
  (`VIX_REGIME_THRESHOLDS`, `getPositionMultiplierForLevel`).

# Citations

* Runtime builder: `buildSwingConstitution()` in `magi-core/lib/constitution.js`.
