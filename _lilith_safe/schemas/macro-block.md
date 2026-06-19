---
type: Prompt Block Schema
title: MACRO_BLOCK
description: Schema for the synthetic macro block (VIX regime + cash context).
lilith_safe: true
tags: [lilith, training, schema, macro, vix]
block_tag: MACRO_BLOCK
---

`<MACRO_BLOCK>` carries the macro context: the VIX regime (which gates side
bias) and a small cash-position context. VIX regime gating is mandatory in every
lane.

# Schema

| Field | Type | Enum / Range | Meaning |
|---|---|---|---|
| `vix_regime` | enum | see VIX table | Volatility regime label. |
| `vix_level` | float | `>= 0` | Approximate VIX index value. |
| `cash_pct` | float | `0.0–100.0` | Portfolio cash fraction context. |

VIX regime → side bias (mandatory gating):

| Regime | Side bias |
|---|---|
| `CALM` / `LOW_FEAR` | long bias allowed |
| `NORMAL` | neutral |
| `HIGH_FEAR` | short bias |
| `EXTREME_FEAR` | SELL/SHORT only — BUY is system-blocked |
| `PANIC` | momentum gating tightens; see risk rules |

# Example

```xml
<MACRO_BLOCK>
  <vix regime="CALM" level="14.2" />
  <portfolio cash_pct="35.0" />
</MACRO_BLOCK>
```

# Producer

`_build_macro_block()` in
`lilith-training/scripts/distill_analysis_methods.py`. The VIX regime enum is
shared with `system/echidna-tables` and the MAGI Constitution; see
[risk-rules](/_lilith_safe/constitution/risk-rules.md).
