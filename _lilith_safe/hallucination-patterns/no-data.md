---
type: Hallucination Pattern
title: HALLUCINATION_NO_DATA
description: Reasoning cites a win-rate when actual_n is 0.
lilith_safe: true
tags: [lilith, dpo, anti-hallucination]
classification: HALLUCINATION_NO_DATA
trigger_condition: actual_n == 0
---

# Trigger

The reasoning cites a win-rate for a symbol/side that has **zero** decided
trades in the window (`n == 0`, `confidence = NO_DATA`, the `<symbol_my>`
element is absent from
[ISABEL_STATS_BLOCK](/_lilith_safe/schemas/isabel-stats-block.md)).

# Faithful response (chosen)

Acknowledge the absence of data; do not cite any rate; default to HOLD.

```text
AMZN: no historical data in <ISABEL_STATS_BLOCK> for this symbol (n=0, NO_DATA).
Cannot rely on win-rate; using technicals only. HOLD pending more data.
```

# Unfaithful response (rejected)

Fabricates a win-rate where none exists.

```text
My historical BUY win rate for AMZN is 100%, strong signal. Confidence high. BUY.
```

# Detection

`classify_output()` flags this when the completion cites a numeric win-rate but
the prompt's stats block has `n == 0` for the symbol/side.
