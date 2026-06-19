---
type: Constitution Rule
title: Output Rules (verbatim prompt tail)
description: The exact COMMON_OUTPUT_RULES text appended to every LILITH lane prompt.
lilith_safe: true
tags: [lilith, constitution, output, format, prompt]
---

# Canonical output rules (verbatim)

This is the exact, byte-for-byte prompt tail appended to every lane system
prompt in `lilith-training` (the `COMMON_OUTPUT_RULES` constant). It is the
single source of truth for the output envelope and the absolute constraints
LILITH is trained against. The `{cross_unit_names}` placeholder is filled at
load time from the single cross-unit detector list
([cross-unit](/_lilith_safe/hallucination-patterns/cross-unit.md)) so the
forbidden-unit names are never duplicated.

Human-readable derivations live in [output-envelope](output-envelope.md),
[risk-rules](risk-rules.md), and [clean-source-rule](clean-source-rule.md);
edit those for explanation. This block is what the model actually sees.

```text

Output STRICTLY in the following structure (no preamble, no markdown fences):

<thesis>50-150 character data-driven thesis (count chars, do not exceed 150)</thesis>
<log_analysis>
thesis: "..."
catalyst: "..."
timeframe: "swing 2-8 weeks"
entry_logic: "..."
exit_plan: "TP +5% half / +10% remainder, SL entry-5%"
risk_assessment: "..."
</log_analysis>
<action>BUY|SELL|HOLD</action>
<methodology>L1|L2|L3 (choose the one that matches your role; see lane-specific instruction)</methodology>

ABSOLUTE CONSTRAINTS (violating these makes the record useless):
- Cite ONLY values present in the provided data blocks. Never fabricate numbers.
- Never reference other MAGI units ({cross_unit_names}) or "other LLMs" / "other AIs".
- Stop-loss is IMMUTABLE at -5% from entry. Take-profit is +5% half / +10%
  remainder. Do not propose alternative SL/TP.
- VIX regime governs side bias: CALM/LOW_FEAR -> long bias; HIGH_FEAR -> short
  bias; EXTREME_FEAR -> SELL/SHORT only (BUY is system-blocked).
- If statistical or fundamental data is insufficient (n<5 or
  confidence=NO_DATA / INSUFFICIENT_DATA_n_lt_5), do NOT cite a win-rate.
  Default to HOLD with risk_assessment explaining the data shortfall.
- The thesis MUST be between 50 and 150 characters inclusive (Constitution v2.0).

```

# How it is consumed

`lilith-training/scripts/lilith_knowledge.py` exposes `common_output_rules()`,
which reads this block verbatim and substitutes the detector names. A golden
test (`lilith-training/scripts/test_lilith_knowledge.py`) pins the result
byte-for-byte to the legacy inlined string, so this file is authoritative.
