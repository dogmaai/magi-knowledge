---
type: BigQuery Table
title: distill_decisions (proposed)
description: L1 normalized decision records produced by the deterministic offline extractor — one row per decision attempt (BUY/SELL/HOLD/BLOCKED/WARN_ONLY/CALL_FAILED/NOT_ADOPTED) carrying the full cohort identity so evaluation stays model-independent.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-09T23:56:00Z }
stale_after: 2027-04-09T23:03:00Z
tags: [echidna, bigquery, distillation, proposed]
dataset: magi_core
table_type: BASE TABLE (proposed — created 2026-10-10; draft schema)
---

> **Draft — proposed schema; table created 2026-10-10 in `magi_core`.** Written only by the offline
> extractor (`lib/experience-distillation.js` lineage) — **never by the
> live path**. The DDL lives in `magi-core` (`sql/`) and was applied by Jun on 2026-10-10.

L1 of the three-layer corpus (see the *Learning dataset* section of
[model-consolidation](/system/constitution/model-consolidation.md)):
deterministically extracted decision records matching the
`validateDecision` contract in `lib/experience-distillation.js`. Raw
evidence stays in L0; this layer is the evaluation-ready projection.

# Cohort identity — model names are data, never schema

The cohort key is the 5-tuple
`(unit_name, llm_provider, model_version, prompt_version, boundary)`,
stored both as columns and as a derived `cohort_id` hash. Which model
occupies ARC/SIG stays undecided — cohort columns record what *was* used,
without hardcoding any model into the schema:

| Column | Type | Description |
|---|---|---|
| requested_model | STRING | Model name passed at call time. |
| served_model | STRING | Model name the provider reports served. |
| model_version | STRING | The cohort-tuple model value the extractor groups on — the **served-model identifier recorded at decision time**, mirroring [`thoughts.model_version`](thoughts.md) / [model-cohorting](/system/constitution/model-cohorting.md) semantics. It is a provider tag string (e.g. `gemini-3.8-flash`, `ministral-3:8b-ctx32k`), not a semantic version. |
| model_revision | STRING | Immutable revision (snapshot id / weights digest) when the provider exposes one — NULL when unavailable; never guessed. |
| model_identity_quality | STRING | `revision_pinned` / `mutable_alias` / `unknown`. A mutable alias (e.g. an Ollama tag) does **not** guarantee identical weights across calls. |

`model_version` alone never proves weight identity: when
`model_identity_quality` is `mutable_alias` or `unknown` (or
`model_revision` is NULL where the provider exposes revisions), the same
`model_version` may cover different weights. Comparisons across such
cohorts must record that caveat in the bundle's `uncertainty` instead of
silently treating the cohort as a single configuration.

`prompt_version` is the prompt-template version; the assembled input is
fingerprinted separately as `context_sha256` (+ `context_uri` to the GCS
body), so context drift doesn't need cohort splits. Execution settings
(temperature, reasoning, tools, guard/arbiter config) are captured as
`execution_config_hash` for comparison filtering.

# Schema (proposed)

| Column | Type | Description |
|---|---|---|
| decision_id | STRING | Corpus identifier — issued for every attempt including `CALL_FAILED`. |
| record_version | INT64 | Correction chain; latest valid version wins (≥1). |
| record_hash | STRING | SHA-256 over canonical JSON (codepoint-sorted keys — `canonicalJson`/`contentHash` in `lib/method-card.js`) of the row's semantic fields; used for dedupe/conflict detection. |
| experiment_id | STRING | Owning experiment (`arc-sig-paper-1`). |
| cohort_id | STRING | Hash of the 5-element cohort tuple. |
| unit_name | STRING | Unit name. |
| llm_provider | STRING | Provider (`gemini` / `ollama` / …). |
| requested_model | STRING | Model name passed at call time — see cohort table above. |
| served_model | STRING | Provider-reported served model — see cohort table above. |
| model_version | STRING | Cohort-tuple model value — see cohort table above. |
| model_revision | STRING | Provider-exposed immutable revision, NULL when unavailable — see cohort table above. |
| model_identity_quality | STRING | `revision_pinned` / `mutable_alias` / `unknown` — see cohort table above. |
| prompt_version | STRING | Prompt-template version. |
| execution_config_hash | STRING | Hash of temperature/reasoning/tools/guard/arbiter config. |
| context_uri | STRING | GCS reference to the exact assembled input (messages, system prompt, tool schemas, adopted cards). |
| context_sha256 | STRING | SHA-256 of the serialized context **bytes** (payload hash, not canonical JSON) — matches `body_sha256` semantics on `decision_sources`. |
| opportunity_id | STRING | Same-time/same-information comparison key shared across units. NULL means the decision was never assigned to a cross-unit opportunity set — expected for solo or non-competing decisions, not missing data. |
| session_id | STRING | Session. |
| symbol | STRING | Ticker. |
| action | STRING | `BUY`/`SELL`/`HOLD`/`BLOCKED`/`WARN_ONLY`/`CALL_FAILED`/`NOT_ADOPTED`. |
| proposed_action | STRING | The unit's original proposal when `action` is a post-verdict state (`NOT_ADOPTED` etc.). |
| decided_at | TIMESTAMP | Decision instant. |
| boundary | STRING | Learning/data boundary label. |
| mode | STRING | `NORMAL` / `SHADOW`. |
| qty | NUMERIC | Requested quantity when applicable. |
| confidence | FLOAT64 | Declared confidence. |
| extractor_version | STRING | Version of the deterministic extractor that wrote this row. |
| extracted_at | TIMESTAMP | Extraction instant (never used as decision-time evidence). |

All timestamps are UTC `TIMESTAMP` values written by MAGI-side clocks —
`decided_at` at decision write time, `extracted_at` at extraction. The
contract is their ordering, not sub-millisecond clock agreement across
writers.

# Contracts

* **Extractor-only writer.** Rows are a deterministic function of L0
  inputs + extractor version.
* **Corrections are versions, conflicts are quarantined.** A newer
  `record_version` fully replaces the older row. Same `decision_id` +
  same max `record_version` + different `record_hash` is a conflict:
  **every** row for that key is excluded from extraction and reported —
  never resolved by arrival order or an automatic pick.
* **Full decision space.** HOLD, guard-blocked, failed calls and
  non-adopted proposals are rows too — the corpus must cover the whole
  opportunity set, not just filled trades.
