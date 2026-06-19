---
type: Hallucination Pattern
title: HALLUCINATION_ROUND_NUMBER
description: Lazy round-multiple-of-10 win-rate citation that differs from actual.
lilith_safe: true
tags: [lilith, dpo, anti-hallucination]
classification: HALLUCINATION_ROUND_NUMBER
trigger_condition: claimed in {50,60,70,80,90,100} and abs(claimed - actual) > 2
---

# Trigger

The reasoning cites a suspiciously round win-rate — a multiple of 10 in
`{50, 60, 70, 80, 90, 100}` — that differs from the actual value by more than 2
points. This catches lazy rounding even when the gross [mismatch](mismatch.md)
threshold is not crossed.

# Faithful response (chosen)

Cite the exact one-decimal value from the block; never round to a clean 10.

```text
BUY win-rate is 67.0% over n=12 (STABLE). Using the exact figure, not a rounded
"70%". Edge is real but modest. BUY.
```

# Unfaithful response (rejected)

Rounds 67.0% up to a tidy 70%.

```text
My BUY win-rate is about 70% here, solid edge. Confidence high. BUY.
```

# Detection

`classify_output()` flags a cited rate that is a round multiple of 10 and is
more than 2pt from the stats-block value.
