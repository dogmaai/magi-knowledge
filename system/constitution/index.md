# PLM Runtime Constitution (v3.8)

The full swing-trading constitution that all PLM units receive as their system
prompt. Built at runtime by `buildSwingConstitution()` in
`magi-core/lib/constitution.js`.

This tree mirrors the runtime prompt section-by-section so each rule can be
reviewed, cross-referenced, and updated independently. When the constitution
changes in `lib/constitution.js`, update the corresponding section doc here.

# Version

| Field | Value |
|---|---|
| Version | 3.8 |
| Effective | 2026-08-24 |
| Builder | `magi-core/lib/constitution.js` (`buildSwingConstitution`) |
| BQ store | [constitution](/system/echidna-tables/constitution.md) table |

# Sections (in prompt order)

| # | Section | Key rule | Mutable? |
|---|---|---|---|
| 1 | [IDENTITY](identity.md) | Competitive swing-trader mission | yes |
| 2 | [NORTH STAR](north-star.md) | Four cardinal objectives (risk-adj return > alpha > survival > patterns) | yes |
| 3 | [YOUR EDGE](edge.md) | Six competitive advantages (timeframe, ensemble, ISABEL, HERMES, anti-crowding, adaptivity) | yes |
| 4 | [EXPECTANCY DISCIPLINE](expectancy.md) | Profit = WR x avg_win - LR x avg_loss; R:R >= 2:1 | yes |
| 5 | [ISABEL - Information Gateway](isabel-gateway.md) | Advisory only; unit decides | yes |
| 6 | [MARKET REGIME AWARENESS - VIX](vix-regime.md) | VIX governs size, not direction | yes |
| 7 | [TRADING UNIVERSE](trading-universe.md) | Dynamic symbol list + L3 exclusions | **dynamic** |
| 8 | [TIMEFRAME: SWING](timeframe-swing.md) | Days to 2-3 months; entry needs catalyst + 2:1 R:R | yes |
| 9 | [SWING TRADING DISCIPLINE](swing-discipline.md) | Check positions first; HOLD is valid | yes |
| 10 | [THOUGHT RECORDING](thought-recording.md) | Mandatory 6-field log_analysis before every decision; 1:1 log_analysis/place_order pairing | yes |
| 11 | [CONFIDENCE CALIBRATION](confidence-calibration.md) | Confidence = calibrated probability; 0.80-0.89 is the overconfidence trap | yes |
| 12 | [CONCERNS ARE VETO SIGNALS](concerns-veto.md) | Concerns must be resolved with evidence or treated as veto | yes |
| 13 | [POSITION MANAGEMENT](position-management.md) | SL -5% long / -3.5% short; short entries sized 0.7x; TP +10%/+20%; max 8 symbols | **SL immutable** |
| 14 | [PROHIBITIONS](prohibitions.md) | Seven forbidden actions | yes |
| 15 | [ISABEL REFERENCE](isabel-reference.md) | Runtime-injected ISABEL feedback | **dynamic** |
| 16 | [Available Tools](tools.md) | Tool-call interface (get_price, place_order, etc.) | yes |

# Relationship to LILITH-safe constitution

The [LILITH-safe constitution](/_lilith_safe/constitution/) is a **strict
subset**: it captures only the immutable, universal rules (clean-source, output
envelope, risk-rules) that are safe to feed into training. The PLM constitution
here is the **full version** that includes competitive framing, ISABEL advisory,
HERMES intelligence, and the complete prohibitions list -- none of which LILITH
may see.

| Aspect | PLM (this tree) | LILITH-safe |
|---|---|---|
| SL/TP | -5% / +10% half, +20% final | -5% / +5% half, +10% remainder |
| VIX | Sizing lever (direction from edge) | Hard side-bias gating |
| ISABEL | Advisory tool-call | Own stats block only |
| Other units | Part of ensemble | Forbidden (clean-source) |
| Scope | Full competitive doctrine | Immutable rules only |

# How to update

1. Edit the corresponding section `.md` file in this directory.
2. If the change affects an immutable rule (SL, clean-source), also update the
   LILITH-safe counterpart under `_lilith_safe/constitution/`.
3. Update the `version` frontmatter field in changed section docs.
4. Run `python scripts/okf_lint.py` to verify OKF conformance.
5. Update `buildSwingConstitution()` in `magi-core/lib/constitution.js` to
   match (the code is the runtime source of truth; OKF is the reference doc).
