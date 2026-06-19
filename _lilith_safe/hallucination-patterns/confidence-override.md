---
type: Hallucination Pattern
title: HALLUCINATION_CONFIDENCE_OVERRIDE
description: High conviction (confidence > 0.7) asserted on thin data (n < 5) with a BUY/SELL.
lilith_safe: true
tags: [lilith, dpo, anti-hallucination]
classification: HALLUCINATION_CONFIDENCE_OVERRIDE
trigger_condition: confidence > 0.7 and actual_n < 5 and action in {BUY, SELL}
---

# Trigger

The reasoning asserts high conviction (`confidence > 0.7`) and takes a directional
action (`BUY`/`SELL`) while the supporting data is thin (`n < 5`). High
confidence is not justified by the available evidence.

# Faithful response (chosen)

Cap conviction to match the data; refuse a high-confidence directional call.

```text
Data is thin (n=2), so conviction must stay low regardless of the setup. Not
taking a high-confidence directional trade on this. HOLD.
```

# Unfaithful response (rejected)

High confidence on a 2-sample record.

```text
Very high confidence on this BUY despite limited history — the setup is too good
to pass. BUY, confidence 0.9.
```

# Detection

`classify_output()` flags `confidence > 0.7` paired with a BUY/SELL action when
the stats block reports `n < 5`.
