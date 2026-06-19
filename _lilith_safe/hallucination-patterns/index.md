# Anti-hallucination patterns

The six hallucination classes targeted by LILITH's Phase B0 anti-hallucination
DPO training. Each document defines the trigger, the faithful (`chosen`) shape,
and the unfaithful (`rejected`) shape used to build preference pairs.

These definitions are the single source of truth shared by:

* `extract_hallucination_negatives.py` — mines `rejected` examples from BigQuery.
* `generate_chosen_examples.py` — synthesises matching `chosen` responses.
* `evaluate_anti_hallucination.py` — `classify_output()` checks all six.

# Patterns

* [no-data](no-data.md) - Cites a win-rate when `n == 0`.
* [insufficient-n](insufficient-n.md) - Cites a win-rate when `n < 5`.
* [mismatch](mismatch.md) - Claimed win-rate differs from actual by > 5pt.
* [round-number](round-number.md) - Lazy round-multiple-of-10 citation.
* [cross-unit](cross-unit.md) - References another MAGI unit (clean-source violation).
* [confidence-override](confidence-override.md) - High conviction on thin data.
