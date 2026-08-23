# Bundle Update Log

## 2026-08-23
* **Creation**: [syncing-spec-to-gemini-enterprise](/.agents/skills/syncing-spec-to-gemini-enterprise/SKILL.md) — the procedure for publishing the `system/` digest to a Discovery Engine (Gemini Enterprise / Vertex AI Search) data store: GCS object with a stable name, `documents:import` with `dataSchema: content` + `reconciliationMode: FULL`, attach to the Gemini Enterprise app, and the boundary rules (`_lilith_safe/` never indexed, PLM jobs stay off Gemini Enterprise per MAGI-GE-DESIGN-001-v2 §2.3).
* **Creation**: [scripts/okf_export.py](/scripts/okf_export.py) — flattens one tree (`system/` or `_lilith_safe/`) into a single Markdown digest for syncing the common spec to LLMs without repository access. Exactly one tree per run, and a `lilith_safe` flag that disagrees with its tree aborts the export, so a digest can never straddle the contamination boundary. Documented under `Consuming the bundle` in the [README](/README.md).

## 2026-08-22
* **Creation**: [collaborating-with-antigravity](/.agents/skills/collaborating-with-antigravity/SKILL.md) — the Antigravity × Devin collaboration workflow (GitHub Issues/PRs as the shared hub, role split, PR description structure, review feedback loop, escalation to @dogmaai).

## 2026-08-19
* **Creation**: [SEKHMET](/system/plm-units/sekhmet.md) — offline sequential/causal analyzer (Sakana `fugu-ultra`, `magi-fugu-analyzer`), plus the [fugu-sequential-patterns](/system/echidna-tables/fugu-sequential-patterns.md) and [daphne-feedback](/system/echidna-tables/daphne-feedback.md) table docs.
* **Enhancement**: Added a `Causal analysis ownership` section to the [PLM unit registry](/system/plm-units/index.md) — SEKHMET owns causal analysis, MELCHIOR-1/Gemini owns generic logical & quantitative pattern analysis, DAPHNE does SQL-based static causal classification. Cross-referenced from [MELCHIOR-1](/system/plm-units/melchior-1.md) and [gemini-pattern-analysis](/system/echidna-tables/gemini-pattern-analysis.md).
* **Enhancement**: Catalogued the offline analysis jobs (Cloud Run + Cloud Scheduler names, schedules, models) in [magi-core](/system/services/magi-core.md), cross-checked against `magi-core/.github/workflows/deploy.yml`.

## 2026-06-23
* **Creation**: PLM Runtime Constitution v3.0 under [system/constitution](/system/constitution/) — 14 modular per-section docs mirroring `buildSwingConstitution()` in `magi-core/lib/constitution.js`. Each section is independently editable for easy iteration as the constitution evolves.
* **Enhancement**: Added `# Constitution basis` cross-references to guard layer docs (L0, L1.5, L2, L3, L5, L6) linking each guard to the constitutional section it enforces.
* **Enhancement**: Added OKF reference section to [constitution BQ table doc](/system/echidna-tables/constitution.md) linking to both the PLM and LILITH-safe constitution trees.

## 2026-06-19
* **Initialization**: Created the OKF v0.1 bundle skeleton — root [index](/index.md), `_lilith_safe/` and `system/` trees, and the conformance + LILITH-boundary tooling under `scripts/`.
* **Creation**: ECHIDNA BigQuery data catalog under [system/echidna-tables](/system/echidna-tables/), schemas pulled live from `magi_core.INFORMATION_SCHEMA`.
* **Creation**: PLM unit registry under [system/plm-units](/system/plm-units/), the cross-repo [service map](/system/services/), and the [L1–L7 guard reference](/system/guards/).
* **Creation**: LILITH-safe ground truth — prompt-block [schemas](/_lilith_safe/schemas/), the six [hallucination patterns](/_lilith_safe/hallucination-patterns/), and the [constitution](/_lilith_safe/constitution/) clean-source rule.
