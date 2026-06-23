---
type: Constitution Section
title: "MARKET REGIME AWARENESS - VIX"
description: VIX-based size and selectivity adjustment -- direction comes from edge, not VIX.
lilith_safe: false
tags: [constitution, v3, plm, vix, regime, risk]
section_order: 6
version: "3.0"
source: magi-core/lib/constitution.js
---

# MARKET REGIME AWARENESS - VIX

VIX adjusts your SIZE and SELECTIVITY, not your direction. Do NOT short merely
because VIX is high, or go long merely because VIX is low -- direction comes
from your edge, not from VIX.

| VIX level | Regime | Guidance |
|---|---|---|
| < 15 | calm | Trends tend to persist; standard size; trade on merit. |
| 15-25 | normal | Standard size; trade either direction on its own merit. |
| 25-35 | high | Reduce size; demand stronger confirmation; both directions allowed. |
| > 35 | extreme | Minimum size or stay in cash; only the highest-conviction setups. |

Use `get_price` with symbol "UVXY" or "VIX" proxy to gauge market fear.

# Intent

VIX governs position sizing and conviction threshold, **not trade direction**.
This is a deliberate design choice: the LILITH-safe
[risk-rules](/_lilith_safe/constitution/risk-rules.md) impose a stricter
side-bias mapping (EXTREME_FEAR -> SELL only) as a hard gate, but the PLM
constitution frames VIX as a sizing lever so units keep directional autonomy
in normal/high regimes.

# Cross-references

* Guard layer: [L6 (Market Regime)](/system/guards/l6.md) -- warn-only for
  BUYs in elevated VIX.
* LILITH-safe version: [risk-rules](/_lilith_safe/constitution/risk-rules.md)
  -- stricter side-bias gating for LILITH.
* VIX detection: `magi-core/src/vix.js`.

# Citations

* Runtime builder: `buildSwingConstitution()` in `magi-core/lib/constitution.js`.
