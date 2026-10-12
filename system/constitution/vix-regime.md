---
type: Constitution Section
title: "MARKET REGIME AWARENESS - VIX"
description: VIX-based size and selectivity adjustment -- direction comes from edge, not VIX; bands match the L6 regime enum, and L6 hard-blocks risk-increasing BUYs at VIX >= 25.
lilith_safe: false
status: stable
generated: { by: devin/local, at: 2026-10-12T03:11:00Z }
verified: [{ by: human:jun, at: 2026-06-23T01:27:14Z }, { by: human:jun, at: 2026-10-12T02:46:00Z }, { by: human:jun, at: 2026-10-12T03:56:00Z }]
stale_after: 2027-04-12T03:56:00Z
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
| 25 to < 30 | `EXTREME_FEAR` | Minimum size (0.3x cap = 4.5% of equity per symbol, Optuna-locked). Both directions allowed; oversize orders clamp to the allowed qty or are skipped when no headroom remains. | cap + clamp (new policy; see Modes) |
| >= 30 | `PANIC` | Stay in cash unless exiting: all risk-increasing orders are system-blocked in BOTH directions (new BUY/SHORT, adds, flips). Only exposure-reducing orders pass. | block risk-increasing orders, both sides |

Boundaries are lower-inclusive (`classifyVixRegime` uses `<` against each
`*_MAX`), so VIX exactly 25.0 is `EXTREME_FEAR` and exactly 30.0 is `PANIC`.

**Modes.** `L6_POLICY` selects enforcement (`magi-core/src/llm.js`,
`lib/l6-policy.js`): `legacy` = the pre-2026-10-12 rule (EXTREME_FEAR/PANIC
hard-block BUYs) and is the code default; `observe` keeps legacy enforcement
while journaling each order's new-policy verdict and allowed qty
(`WARN_ONLY` thoughts rows marked `L6_OBSERVE`) and shadow-tracking the
EXTREME_FEAR BUY candidates legacy blocks (`trades_shadow` rows with
`trade_mode='L6_OBSERVE'`); `live` applies the new policy above. See
[L6](/system/guards/l6.md) for the rollout and evaluation plan.

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
(`EXTREME_FEAR` is SELL/SHORT only, BUY system-blocked) originally applied to
the standard PLM lane as well — Jun tightened L6 to a hard block on
2026-09-21 (option A). On **2026-10-12 Jun changed the policy**: EXTREME_FEAR
keeps the small-cap sizing but drops the directional veto (BUY/SHORT both
allowed, oversize clamped to the cap); PANIC now blocks risk-increasing
orders on **both** sides. The LILITH-safe risk-rules document is unchanged —
it governs the LILITH lane, not the PLM lane. Rollout is staged via
`L6_POLICY` (`legacy` → `observe` → `live`); see [l6.md](/system/guards/l6.md).

Earlier revisions of this section used four bands (`< 15` / `15-25` / `25-35`
/ `> 35`) that did not line up with the five-level enum and described
`25-35` as "both directions allowed" while L6 blocked BUYs from 25 — that
drift was aligned on 2026-10-12 (magi-core `lib/constitution.js` updated in
the linked PR). The option-A decision date (2026-09-21) precedes `l6.md`'s
`generated` (2026-09-23) and both of its `human:jun` verifications
(2026-09-22, 2026-10-06), so the verified `l6.md` text already reflects it. The threshold itself was subsequently reviewed: Jun's 2026-10-12 policy change keeps the regime boundaries and moves EXTREME_FEAR from a directional veto to cap-only enforcement while hardening PANIC to both directions — staged via `L6_POLICY` observation first.

# Cross-references

* Guard layer: [L6 (Market Regime)](/system/guards/l6.md) -- `L6_POLICY`
  modes; `PANIC` blocks risk-increasing orders both directions under the new
  policy; warn-only in `HIGH_FEAR`.
* Sizing: [L1.5](/system/guards/l1-5.md) -- per-regime position multiplier
  (defaults `CALM`/`LOW_FEAR` 1.0, `HIGH_FEAR` 0.7, `EXTREME_FEAR`/`PANIC`
  0.3; a `POSITION_MULTIPLIER` row in
  [optuna-params](/system/echidna-tables/optuna-params.md) overrides a level
  — except `EXTREME_FEAR`, which is locked at 0.3 during the L6 policy
  validation period — and the prompt renders the resolved value).
* LILITH-safe version: [risk-rules](/_lilith_safe/constitution/risk-rules.md)
  -- side-bias mapping that L6 enforces at `EXTREME_FEAR`.
* VIX detection and regime enum: `magi-core/lib/vix.js`
  (`VIX_REGIME_THRESHOLDS`, `getPositionMultiplierForLevel`).

# Citations

* Runtime builder: `buildSwingConstitution()` in `magi-core/lib/constitution.js`.
