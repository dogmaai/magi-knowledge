---
type: Prompt Block Schema
title: ISABEL_STATS_BLOCK
description: Schema for LILITH's own historical win/loss statistics block.
lilith_safe: true
tags: [lilith, training, isabel, schema, ground-truth]
block_tag: ISABEL_STATS_BLOCK
source_table: trades_active
window: 30d
---

`<ISABEL_STATS_BLOCK>` carries the historical win/loss record LILITH is allowed
to cite — derived from **its own** trades only, over a rolling 30-day window.
The clean-source rule applies: the block never contains another unit's record.

# Schema

Block attributes:

| Attribute | Type | Notes |
|---|---|---|
| `source` | string | Always `trades_active` (the dataset view). |
| `window` | string | Rolling window, e.g. `30d`. |

Inner `<symbol_my>` element (per-symbol, per-side):

| Field | Type | Range / Enum | Meaning |
|---|---|---|---|
| `name` | string | ticker symbol | Symbol the stats describe. |
| `side` | enum | `buy` \| `sell` | Trade direction. |
| `wins` | int | `>= 0` | WIN count in window. |
| `loses` | int | `>= 0` | LOSE count in window. |
| `n` | int | `>= 0` | Decided trades = `wins + loses`. |
| `win_rate_pct` | float | `0.0–100.0` | `wins / n * 100`, one decimal. |
| `confidence` | enum | see below | Data-sufficiency label, derived from `n`. |

`confidence` enum (derived purely from `n`):

| Value | Condition |
|---|---|
| `NO_DATA` | `n == 0` (the `<symbol_my>` element is absent) |
| `INSUFFICIENT_DATA_n_lt_5` | `0 < n < 5` |
| `LOW` | `5 <= n < 10` |
| `STABLE` | `n >= 10` |

# Examples

With data:

```xml
<ISABEL_STATS_BLOCK source="trades_active" window="30d">
  <symbol_my name="AAPL" side="buy" wins="7" loses="3" n="10"
             win_rate_pct="70.0" confidence="STABLE" />
</ISABEL_STATS_BLOCK>
```

No data (the symbol has zero decided trades — LILITH must NOT cite a win-rate):

```xml
<ISABEL_STATS_BLOCK source="trades_active" window="30d">
  <!-- AMZN entry not present in symbol_my -->
</ISABEL_STATS_BLOCK>
```

# Consumption rule

If `confidence` is `NO_DATA` or `INSUFFICIENT_DATA_n_lt_5` (i.e. `n < 5`),
LILITH must NOT cite a win-rate and should default to `HOLD`. Citing a rate
under those conditions is a hallucination — see
[no-data](/_lilith_safe/hallucination-patterns/no-data.md) and
[insufficient-n](/_lilith_safe/hallucination-patterns/insufficient-n.md).

# Producer / consumer

Built by `_build_isabel_stats_block()` in
`lilith-training/scripts/distill_analysis_methods.py`; parsed by
`parse_stats_from_prompt()` in
`lilith-training/scripts/generate_chosen_examples.py`.
