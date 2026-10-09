---
type: BigQuery Table
title: distill_decisions (proposed)
description: L1 normalized decision records produced by the deterministic offline extractor — one row per decision attempt (BUY/SELL/HOLD/BLOCKED/WARN_ONLY/CALL_FAILED/NOT_ADOPTED) carrying the full cohort identity so evaluation stays model-independent.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-09T23:03:00Z }
stale_after: 2027-04-09T23:03:00Z
tags: [echidna, bigquery, distillation, proposed]
dataset: magi_core
table_type: BASE TABLE (proposed — does not exist yet)
---

> **Draft — proposed table, not yet created.** Written only by the offline
> extractor (`lib/experience-distillation.js` lineage) — **never by the
> live path**. The DDL lives in `magi-core` (`sql/`) for Jun to apply.

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
| model_revision | STRING | Immutable revision (snapshot id / weights digest) when the provider exposes one — NULL when unavailable; never guessed. |
| model_identity_quality | STRING | `revision_pinned` / `mutable_alias` / `unknown`. A mutable alias (e.g. an Ollama tag) does **not** guarantee identical weights across calls. |

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
| record_hash | STRING | Content hash for dedupe/conflict detection. |
| experiment_id | STRING | Owning experiment (`arc-sig-paper-1`). |
| cohort_id | STRING | Hash of the 5-element cohort tuple. |
| unit_name | STRING | Unit name. |
| llm_provider | STRING | Provider (`gemini` / `ollama` / …). |
| requested_model / served_model / model_revision / model_identity_quality | STRING | Model-identity split — see table above. |
| prompt_version | STRING | Prompt-template version. |
| execution_config_hash | STRING | Hash of temperature/reasoning/tools/guard/arbiter config. |
| context_uri | STRING | GCS reference to the exact assembled input (messages, system prompt, tool schemas, adopted cards). |
| context_sha256 | STRING | Hash of that assembled context. |
| opportunity_id | STRING | Same-time/same-information comparison key shared across units (NULL when not assigned). |
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

# Contracts

* **Extractor-only writer.** Rows are a deterministic function of L0
  inputs + extractor version; a re-run with identical inputs reproduces
  identical `record_hash`es.
* **Full decision space.** HOLD, guard-blocked, failed calls and
  non-adopted proposals are rows too — the corpus must cover the whole
  opportunity set, not just filled trades.
