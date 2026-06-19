---
type: Prompt Block Schema
title: TECHNICALS_BLOCK
description: Schema for the synthetic technicals block used by the L3 lane.
lilith_safe: true
tags: [lilith, training, schema, technicals, l3]
block_tag: TECHNICALS_BLOCK
---

`<TECHNICALS_BLOCK>` supplies measurable price/vol features for the L3
(quantitative) lane. The L3 lane must cite numerical thresholds explicitly and
must never use hedge words (`feels`, `seems`, `looks like`, `appears`,
`I think`).

# Schema

Block attributes:

| Attribute | Type | Enum |
|---|---|---|
| `asof` | string | `t0` |
| `state` | enum | `BULL` \| `BEAR` \| `RANGE` \| `BREAKOUT` \| `MEAN_REVERT` |

Typical fields (floats unless noted):

| Field | Meaning |
|---|---|
| `ret_5d`, `ret_20d`, `ret_252d` | Trailing returns (%). |
| `rsi_14` | Relative Strength Index, 14-period. |
| `sma_50`, `sma_200` | Moving averages (cross gates trend bias). |
| `atr_14` | Average True Range, 14-period (vol carry). |

# Example

```xml
<TECHNICALS_BLOCK asof="t0" state="BULL">
  <returns ret_5d="2.1" ret_20d="6.4" ret_252d="28.0" />
  <oscillators rsi_14="58.0" />
  <trend sma_50="190.2" sma_200="172.8" />
  <volatility atr_14="3.4" />
</TECHNICALS_BLOCK>
```

# Producer

`_build_technicals_block()` in
`lilith-training/scripts/distill_analysis_methods.py`.
