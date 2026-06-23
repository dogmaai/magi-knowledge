# Bundle Update Log

## 2026-06-23
* **Creation**: PLM Runtime Constitution v3.0 under [system/constitution](/system/constitution/) — 14 modular per-section docs mirroring `buildSwingConstitution()` in `magi-core/lib/constitution.js`. Each section is independently editable for easy iteration as the constitution evolves.
* **Enhancement**: Added `# Constitution basis` cross-references to guard layer docs (L0, L1.5, L2, L3, L5, L6) linking each guard to the constitutional section it enforces.
* **Enhancement**: Added OKF reference section to [constitution BQ table doc](/system/echidna-tables/constitution.md) linking to both the PLM and LILITH-safe constitution trees.

## 2026-06-19
* **Initialization**: Created the OKF v0.1 bundle skeleton — root [index](/index.md), `_lilith_safe/` and `system/` trees, and the conformance + LILITH-boundary tooling under `scripts/`.
* **Creation**: ECHIDNA BigQuery data catalog under [system/echidna-tables](/system/echidna-tables/), schemas pulled live from `magi_core.INFORMATION_SCHEMA`.
* **Creation**: PLM unit registry under [system/plm-units](/system/plm-units/), the cross-repo [service map](/system/services/), and the [L1–L7 guard reference](/system/guards/).
* **Creation**: LILITH-safe ground truth — prompt-block [schemas](/_lilith_safe/schemas/), the six [hallucination patterns](/_lilith_safe/hallucination-patterns/), and the [constitution](/_lilith_safe/constitution/) clean-source rule.
