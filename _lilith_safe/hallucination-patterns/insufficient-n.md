---
type: Hallucination Pattern
title: HALLUCINATION_INSUFFICIENT_n
description: Reasoning cites a win-rate when actual_n < 5.
lilith_safe: true
tags: [lilith, dpo, anti-hallucination]
classification: HALLUCINATION_INSUFFICIENT_n
trigger_condition: 0 < actual_n < 5
---

# Trigger

The reasoning cites a win-rate when the sample is too small to be meaningful
(`0 < n < 5`, `confidence = INSUFFICIENT_DATA_n_lt_5`).

# Faithful response (chosen)

Flag the low sample; do not lean on the rate; bias toward HOLD.

```text
Only n=3 decided trades for this side — INSUFFICIENT_DATA_n_lt_5. Not enough to
trust a win-rate. Treating as low-conviction; HOLD unless technicals are decisive.
```

# Unfaithful response (rejected)

Treats a 2/3 record as a reliable edge.

```text
Win rate is strong on this side, clear edge. Confidence high. BUY.
```

# Detection

`classify_output()` flags a cited win-rate while the stats block reports
`0 < n < 5`.
