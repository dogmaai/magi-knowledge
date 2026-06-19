---
okf_version: "0.1"
---

# MAGI Knowledge Bundle

Single source of truth for MAGI system knowledge, expressed in the
[Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
(OKF v0.1). Authored for both humans and the AI agents that operate MAGI
(Devin, AKA-1, ARIEL) and for the LILITH training pipeline.

# Trees

* [_lilith_safe/](_lilith_safe/) - Clean-source ground truth the LILITH training pipeline MAY consume. Contamination-guarded.
* [system/](system/) - Full-system knowledge (ECHIDNA tables, PLM unit registry, services, guard layers). MUST NOT flow into LILITH.

# The LILITH contamination boundary

LILITH (the fine-tuned Qwen2.5-3B reasoner) must reason **only** from its own
verifiable data and never from other MAGI units' processed intelligence or from
Section 5 ("Jun Review Only") ticker picks. This bundle enforces that boundary
structurally:

* Everything LILITH training may read lives under `_lilith_safe/` and is the
  only thing `scripts/lilith_safe_loader.py` will load.
* `scripts/okf_lint.py` fails CI if a `_lilith_safe/` doc leaks a cross-unit
  name, a unit win-rate, or a Section 5 / ticker pick — and if any doc's
  `lilith_safe` flag disagrees with its location.

See [_lilith_safe/index.md](_lilith_safe/) for details.
