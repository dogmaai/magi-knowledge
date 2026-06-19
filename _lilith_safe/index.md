# LILITH-safe knowledge

Everything under this tree is **clean-source ground truth** that the
`dogmaai/lilith-training` pipeline is allowed to read when building training
prompts, generating DPO pairs, and evaluating outputs.

It contains **structure and rules, never another unit's data**:

* Prompt-block *schemas* describe the *shape* of the data blocks LILITH reasons
  over (field names, types, enums) — they carry no real win-rates or picks.
* Hallucination patterns are *definitions* of failure modes plus the
  faithful/`chosen` vs unfaithful/`rejected` contrast used for DPO.
* The constitution docs capture the immutable rules LILITH must obey.

# Contents

* [schemas/](schemas/) - Synthetic prompt-block schemas (ISABEL stats, fundamentals, technicals, macro).
* [hallucination-patterns/](hallucination-patterns/) - The six anti-hallucination classes targeted in Phase B0 DPO.
* [constitution/](constitution/) - Clean-source rule, output envelope, immutable risk rules.

# Boundary rules (enforced by CI)

1. Every doc here declares `lilith_safe: true`.
2. No cross-unit MAGI names appear here — except the single cross-unit
   *detector* doc ([hallucination-patterns/cross-unit](/_lilith_safe/hallucination-patterns/cross-unit.md)),
   which lists names so the trainer can *detect and refuse* them.
3. No win-rates attributed to a named unit, no Section 5 / "Jun Review Only"
   markers, no explicit ticker entry/stop/target picks.

`scripts/lilith_safe_loader.py` is the only sanctioned reader; it refuses
anything outside this tree and any doc missing the `lilith_safe: true` flag.
