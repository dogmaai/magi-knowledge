---
type: Hallucination Pattern
title: HALLUCINATION_MISMATCH
description: Claimed win-rate differs from the actual win-rate by more than 5 points.
lilith_safe: true
tags: [lilith, dpo, anti-hallucination]
classification: HALLUCINATION_MISMATCH
trigger_condition: abs(claimed_winrate - actual_winrate) > 5
---

# Trigger

The reasoning cites a win-rate that differs from the value present in the stats
block by more than 5 percentage points (`|claimed − actual| > 5pt`).

# Faithful response (chosen)

Cite the rate exactly as given in the block.

```text
Stats show a 62.0% BUY win-rate over n=18 (STABLE). Citing it verbatim; the
edge is moderate, so sizing stays standard. BUY.
```

# Unfaithful response (rejected)

Inflates the cited rate well beyond the actual.

```text
BUY win-rate here is around 85%, very strong. High confidence. BUY.
```

# Detection

`classify_output()` parses the claimed percentage from the completion and
compares it against the stats-block value for the symbol/side.
