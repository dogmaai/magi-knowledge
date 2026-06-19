---
type: Prompt Block Schema
title: FUNDAMENTALS_BLOCK
description: Schema for the synthetic fundamentals block used by the L1 lane.
lilith_safe: true
tags: [lilith, training, schema, fundamentals, l1]
block_tag: FUNDAMENTALS_BLOCK
---

`<FUNDAMENTALS_BLOCK>` supplies valuation / quality / growth / moat features for
the L1 (fundamental) lane. All numbers are synthetic and must be reasoned over
verbatim — LILITH may never invent fundamentals it was not given.

# Schema

Block attributes:

| Attribute | Type | Enum | Meaning |
|---|---|---|---|
| `source` | string | `synthetic` | Origin marker. |
| `asof` | string | `t0` | As-of marker for the scenario. |
| `state` | enum | `VALUE` \| `GROWTH` \| `OVERVALUED` \| `DISTRESSED` \| `MIXED` | Regime that seeds the distributions. |

Inner elements:

| Element | Fields | Type |
|---|---|---|
| `<valuation>` | `pe`, `ev_ebitda`, `fcf_yield_pct` | float |
| `<quality>` | `roic_pct`, `debt_to_equity`, `gross_margin_pct` | float |
| `<growth>` | `revenue_yoy_pct`, `eps_yoy_pct` | float |
| `<moat>` | `width` (`WIDE`\|`NARROW`\|`NONE`), `notes` | enum + string |

# Example

```xml
<FUNDAMENTALS_BLOCK source="synthetic" asof="t0" state="VALUE">
  <valuation pe="11.2" ev_ebitda="7.1" fcf_yield_pct="8.4" />
  <quality roic_pct="18.0" debt_to_equity="0.45" gross_margin_pct="46.0" />
  <growth revenue_yoy_pct="5.0" eps_yoy_pct="7.0" />
  <moat width="WIDE" notes="trading below intrinsic; capital return supportive" />
</FUNDAMENTALS_BLOCK>
```

# Producer

`_build_fundamentals_block()` in
`lilith-training/scripts/distill_analysis_methods.py`. The `state` value selects
the distribution ranges; ground truth lives entirely in the block.
