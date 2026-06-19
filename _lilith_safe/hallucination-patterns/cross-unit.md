---
type: Hallucination Pattern
title: HALLUCINATION_CROSS_UNIT
description: LILITH reasoning references another MAGI unit (clean-source violation).
lilith_safe: true
cross_unit_detector: true
tags: [lilith, dpo, anti-hallucination, clean-source]
classification: HALLUCINATION_CROSS_UNIT
unit_names: [sophia, melchior, anima, casper, oracle, zeroel, tiara, seraph, balthasar]
---

# Trigger

LILITH's reasoning references **another MAGI unit** (or "other LLMs" / "other
AIs"). LILITH is an independent reasoner: per the
[clean-source rule](/_lilith_safe/constitution/clean-source-rule.md) it must
decide solely from its own verifiable data, never from another unit's processed
intelligence.

This is the one document in `_lilith_safe/` permitted to list other-unit names
— it is a **detector definition**, consumed via
`LilithSafeKnowledge.cross_unit_names()` so the trainer can detect and refuse
the names. It lists names only; it never carries another unit's data.

# Detector list

The names treated as cross-unit references (kept in sync with
`CROSS_UNIT_NAMES` in `lilith-training/scripts/distill_analysis_methods.py`),
matched case-insensitively as whole words, plus the phrases "other unit",
"other llm", "other ai":

`sophia`, `melchior`, `anima`, `casper`, `oracle`, `zeroel`, `tiara`,
`seraph`, `balthasar`.

# Faithful response (chosen)

Ignore any other-unit signal; decide independently from own data.

```text
Deciding only from my own ISABEL stats and the raw market blocks. No reference
to any other unit. Stats are thin, so HOLD.
```

# Unfaithful response (rejected)

Defers to another unit's view (clean-source violation).

```text
Another unit is also long on this name, so I'll follow the swarm here. BUY.
```

# Detection

`classify_output()` flags the completion when it matches the detector list
above. This is the highest-priority clean-source guard for LILITH.
