---
type: Policy
title: "MODEL COHORTING"
description: Cohort-reset rule — a model change makes a unit a statistically new entity. Evaluation aggregates are keyed by (unit_name, model_version) and do not carry across the boundary. Documentation-level policy; NOT part of the runtime prompt tree.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-06T08:00:00Z }
stale_after: 2027-04-02T15:10:00Z
tags: [constitution, cohort, model-version, evaluation, isabel, probation, draft]
version: "0.1"
source: none — documentation-level policy, not emitted by buildSwingConstitution()
---

# MODEL COHORTING — cohort identity and reset rule

> **Draft — unverified proposal.** This document defines how a model change is
> treated statistically, so that ISABEL aggregates, probation state and unit
> evaluations cite one canonical rule instead of assuming `unit_name` alone
> identifies "the same" decision-maker. It is documentation-level policy: it is
> **not** a section of `buildSwingConstitution()` and must not be injected into
> PLM prompts. Origin: magi-knowledge Issue #99 (Fable review, item C) →
> magi-core Issue #545.

## Definition

A **cohort** is the statistical identity of a unit:

```text
cohort = (unit_name, model_version)
```

* `unit_name` — the MAGI unit identity (persona, budget slot, deploy job);
  [thoughts](/system/echidna-tables/thoughts.md).`unit_name`.
* `model_version` — the **served** model identifier recorded at decision time
  ([thoughts](/system/echidna-tables/thoughts.md).`model_version`, pending
  magi-core Issue #544). For self-hosted Ollama units this is the local model
  tag including Modelfile-derived variants (e.g. `ministral-3:8b-ctx32k`); for
  hosted providers it is the configured model id, or the API-reported served
  model when the API exposes one.

**A model change creates a new cohort.** Performance statistics, fitted state
and evaluation scores accumulated under the old cohort do not carry over —
the unit is, statistically, a new unit.

## Cohort boundary events

A cohort boundary is crossed when the served model behind a `unit_name`
changes:

* **Configured model change** — deploy-time model id changes
  (`*_MODEL` env, `getLLMModel()` mapping, Ollama tag / Modelfile rebuild).
  Example: [BOREAS](/system/plm-units/boreas.md) `ministral-3:14b` →
  `ministral-3:8b-ctx32k` on 2026-10-02 — the first live boundary under this
  rule; its pre-change rows belong to cohort `(BOREAS, ministral-3:14b)`.
* **Provider-side silent update** — a hosted provider serves different weights
  behind an unchanged model label. Detectable only when `model_version`
  records the API-reported served model; a configured label alone cannot see
  this. Residual risk while instrumentation is incomplete.
* **Provider migration under the same unit name** — the model id necessarily
  changes, so the cohort resets as above.

Not a boundary by itself: `prompt_version` (constitution text) changes —
recorded per thought but not a cohort split under this draft; persona or
unit-name changes without a model change; scheduler/env changes that leave
the served model identical. Whether prompt changes should split cohorts is an
open decision below.

## What resets on a cohort boundary

Scoped to **learned / statistical state** only:

| Aggregate | Current key (implementation) | Cohort-scoped key (this rule) |
|---|---|---|
| ISABEL patterns / win-rates ([isabel-patterns](/system/echidna-tables/isabel-patterns.md)) | `llm_provider` (+symbol/direction) | `(unit_name, model_version)` (+symbol/direction) |
| L4 probation state (`l4_probation` table — deprecated, never materialized; [L4](/system/guards/l4.md)) | `llm_provider` + `side` | `(unit_name, model_version)` + `side` |
| Unit evaluation / scorecards (P0 reporting, [model-consolidation](model-consolidation.md) comparisons) | `unit_name` | `(unit_name, model_version)` |
| Optuna-fitted parameters ([optuna-params](/system/echidna-tables/optuna-params.md)) | `param_name` (~per provider) | cohort-scoped in principle — **frozen**, see open decisions |

A new cohort starts with empty statistics. Probation does not transfer: the
old cohort's probation rows would remain valid history but not block the new
cohort — forward-looking: no `l4_probation` table exists today (deprecated
2026-10-06); if a persisted probation store is introduced, it does not
transfer across cohorts.

## What does NOT reset

* **History** — `thoughts` / `trades` / `sessions` are append-only; old-cohort
  rows stay attributable via the cohort key and are never rewritten or
  deleted.
* **Open positions** — a model swap does not liquidate or re-attribute held
  positions; exits follow the position's own risk rules.
* **Risk-control guards** — L0/L-1/L0.5/L0.9/L1/L1.5/L1.6/L1.7 are
  deterministic, model-agnostic and unaffected
  ([guard classes](/system/guards/index.md)).
* **Unit identity and configuration** — persona, `unit_name`, budget weight
  and deploy wiring are configuration, not learned statistics.

## Cold-start and insufficient samples

A fresh cohort has `n = 0`. Per the [model-consolidation](model-consolidation.md)
selection rule, small samples are reported with their count and uncertainty —
never rounded into a verdict. Evaluation consumers must report `n` per
cohort. How a statistical gate behaves while its cohort lacks sufficient
history (fail-open vs warn-only observation) is defined per layer; the
warn-only demotion question is tracked separately (magi-core Issue #548) and
is not settled here.

## Current state vs this rule (known gaps)

Today no cohort separation exists:

* Statistical keys are `llm_provider`-level — coarser than `unit_name`.
  ADAM and BOREAS share provider `ollama`, so provider-keyed ISABEL/L4 state
  already conflates two distinct units before any model change is considered.
* [thoughts](/system/echidna-tables/thoughts.md) has no model column;
  [sessions](/system/echidna-tables/sessions.md).`llm_model` records the
  *configured* model only. Until magi-core Issue #544 lands, cohorts can be
  reconstructed approximately from deploy history — provider-silent updates
  in that window are invisible.
* Rows with NULL `model_version` (pre-column or uninstrumented paths) belong
  to an unknown-model cohort: they must not be silently merged into the
  current cohort; analysis may attribute them to the deploy-configured model
  only with the attribution stated.

Implementing the `(unit_name, model_version)` aggregation key in ISABEL, L4
and evaluation queries is a **separate implementation phase** (magi-core
Issue #545 scope boundary): each change is judged for independent review
individually. This document is definition only and changes no runtime
behavior.

## Open decisions for Jun

* Whether `prompt_version` changes also split cohorts, or remain an
  in-cohort covariate.
* Whether Optuna-fitted parameters (budget weights, thresholds — currently
  frozen under `OPTUNA_FREEZE`) are re-scoped per cohort when optimization
  resumes.
* Minimum evaluable sample size per cohort before a gate or scorecard treats
  it as judged rather than pending.
* Whether a model swap while the old cohort is on L4 probation warrants a
  review flag (probation evasion is otherwise free).

## Cross-references

* [model-consolidation](model-consolidation.md) — same-condition comparison
  this cohort key makes possible; selection criteria apply per cohort.
* [thoughts](/system/echidna-tables/thoughts.md) /
  [sessions](/system/echidna-tables/sessions.md) — attribution columns;
  `model_version` pending magi-core Issue #544.
* [isabel-patterns](/system/echidna-tables/isabel-patterns.md) /
  `l4_probation` (deprecated) /
  [optuna-params](/system/echidna-tables/optuna-params.md) — the learned
  aggregates this rule re-keys.
* [guards/index](/system/guards/index.md) — statistical-gate vs risk-control
  classification; only statistical gates are cohort-scoped.
* [plm-units/index](/system/plm-units/index.md) — unit→provider→model
  registry; a `model` field change on an active unit is a cohort boundary.
* [BOREAS](/system/plm-units/boreas.md) — first live boundary example
  (2026-10-02 model replacement).
