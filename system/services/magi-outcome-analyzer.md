---
type: Service
title: magi-outcome-analyzer
description: PROPOSED — single offline trade-outcome analyzer (Kimi K3.1 Pro) merging generic WIN/LOSE pattern analysis and time-ordered causal analysis; replaces magi-gemini-analyzer at cutover.
lilith_safe: false
status: draft
generated: { by: claude/opus-5-5, at: 2026-11-09T09:40:00Z }
stale_after: 2027-05-09T09:40:00Z
tags: [service, offline-analysis, causal, patterns, kimi, proposed, draft]
repo: dogmaai/magi-core
---

# Overview

> **Draft — proposal, not implemented.** Nothing below exists in GCP yet.
> The job name, table name and schedule are provisional and **OKF-undefined**
> until Jun approves them. This doc records the design so the implementation
> PR (magi-core) and the doc updates at cutover can cite one place.

**Jun's decision (2026-11-09, Claude session):** consolidate MAGI's offline
LLM trade-outcome analysis into **one** analyzer running Kimi K3.1 Pro.
It takes over both:

1. **Generic WIN/LOSE pattern analysis** — today owned by MELCHIOR-1's
   `magi-gemini-analyzer` →
   [gemini-pattern-analysis](/system/echidna-tables/gemini-pattern-analysis.md).
2. **Time-ordered causal analysis** — vacant since the SEKHMET analyzer was
   retired on 2026-09-17 (see
   [causal analysis ownership](/system/plm-units/index.md#causal-analysis-ownership)).

The point of merging is to avoid two LLM reports over the same
`trades × thoughts` input producing overlapping WIN/LOSE narratives.
This is a supporting-role consolidation; it does not touch the
trade-decision core covered by
[model-consolidation](/system/constitution/model-consolidation.md).

# Scope boundaries

| Stays with | Role | Changed by this proposal? |
|---|---|---|
| **this analyzer** | Generic WIN/LOSE patterns + time-ordered causal chains (thought → decision → regime transition → outcome) | new |
| [DAPHNE](/system/echidna-tables/daphne-feedback.md) (`magi-daphne-analyzer`) | Rule-based LP classification of losses, `IS_CAUSAL` map, prompt hints | **No** — DAPHNE keeps the only prompt-hint path |
| [TYPHON](/system/plm-units/typhon.md) (`magi-core-kimi`) | Live PLM voter (`kimi-k2.6`) | **No** — unit, model and budget weight unchanged; this analyzer is a separate job, not a TYPHON role change |
| [MELCHIOR-1](/system/plm-units/melchior-1.md) (`magi-core-gemini`) | SHADOW voter + HERMES collection | Only its batch-analyzer role moves here; the unit itself is unchanged |

# Proposed configuration (OKF-undefined until approved)

| Field | Proposed value | Notes |
|---|---|---|
| Cloud Run job | `magi-outcome-analyzer` | Provider-neutral name: the retired `magi-fugu-analyzer` and `magi-gemini-analyzer` both tied the job name to a provider |
| Provider / model | `kimi` / `kimi-k3.1-pro` | Model id per Moonshot's public announcement (2026-10); **verify against the Kimi platform model list before implementation** |
| Reasoning effort | `high` | K3.1 Pro reasoning is always on; effort low/high/max |
| Schedule | weekdays, after US close | Reuse the slot of `magi-gemini-analyzer-daily` at cutover |
| Input | last 90 days of `trades` × `thoughts`, strictly timestamp-ordered | Same window SEKHMET used; `thoughts_active` only (exclude SHADOW rows) |
| API key | existing Kimi key used by `magi-core-kimi` | Confirm secret name in [secrets-inventory](secrets-inventory.md) — not recorded there today |
| Output table | `outcome_analysis` (new, `magi_core`) | See schema below |

## Proposed output schema

Merges [gemini-pattern-analysis](/system/echidna-tables/gemini-pattern-analysis.md)
and the deprecated `fugu_sequential_patterns` structure.

| Column | Type | Description |
|---|---|---|
| analysis_id | STRING | PK (UUID per run). |
| analyzed_at | TIMESTAMP | Run time. |
| run_status | STRING | `OK` / `FAILED` / `SKIPPED_NO_DATA` — every run writes a row, including failures. |
| error_message | STRING | Populated when `run_status != 'OK'`. |
| window_start / window_end | TIMESTAMP | Analyzed trade window. |
| trade_count_win / trade_count_lose | INT64 | Trades analyzed. |
| full_analysis | STRING | Human-readable report. |
| structured_analysis | JSON | `win_patterns`, `lose_patterns`, `causal_chains`, `regime_transitions`, `unit_summary` (keyed by `unit_name`, with `n` per unit). |
| summary_japanese | STRING | Short summary for the Discord report. |
| model_version | STRING | API-reported served model (cohort attribution). |
| reasoning_effort | STRING | Effort setting used. |
| prompt_tokens / output_tokens / reasoning_tokens | INT64 | Usage. |

Why a new table instead of reusing `gemini_pattern_analysis`: the table name
is provider-bound, it has no causal or run-status fields, and its existing
rows are Gemini-generated history that should stay attributable as-is.

# Guardrails (lessons from SEKHMET)

SEKHMET was retired after **16 days of zero output** masked by a
graceful-skip exit-0 path, while a >7-day staleness gate silently turned off
its feedback loop. This analyzer therefore:

* **Fails loud.** API/parse failure → `run_status='FAILED'` row **and**
  non-zero exit. No exit-0 skip on error.
* **Is freshness-monitored.** An alert fires when no `run_status='OK'` row
  exists for more than 2 scheduled runs (alert route per
  [discord-migration](discord-migration.md)).
* **Does not feed prompts.** Output goes to humans (Jun / AKA-1 surface) only.
  Injecting findings into PLM prompts is a separate policy decision; DAPHNE
  remains the sole hint path.
* **Reports sample size.** Per-unit findings carry `n`; small samples are
  reported as pending, never as a verdict
  ([model-consolidation](/system/constitution/model-consolidation.md)
  selection rule).
* **Is health-checked.** `kimi-k3.1-pro` is added to
  [magi-model-health-check](magi-model-health-check.md) coverage and to the
  model-deprecation monitor's target list.

# Cutover plan

1. Implement job + table in magi-core (draft PR, independent review per
   [COLLABORATION](/COLLABORATION.md)).
2. Run alongside `magi-gemini-analyzer` for an acceptance window
   (length: Jun's decision — see open decisions). Acceptance gate: every
   scheduled run in the window writes an `OK` row.
3. Switch [magi-moni](magi-moni.md)'s periodic report from
   `gemini_pattern_analysis` to `outcome_analysis` (the only known consumer
   in OKF; confirm in magi-moni code before cutover).
4. Retire `magi-gemini-analyzer` + `magi-gemini-analyzer-daily` (Jun runs
   GCP deletions). Mark
   [gemini-pattern-analysis](/system/echidna-tables/gemini-pattern-analysis.md)
   `deprecated` (table kept read-only for history unless Jun says drop).
5. Update [plm-units/index](/system/plm-units/index.md) causal-analysis
   ownership, [MELCHIOR-1](/system/plm-units/melchior-1.md),
   [magi-core](magi-core.md) scheduler table,
   [gemini-ai-studio](gemini-ai-studio.md) consumer list, and `log.md`.

# Open decisions for Jun

* Job / table / unit naming (provisional names above), and whether the
  analyzer gets a unit codename like SEKHMET had.
* Parallel-run length before retiring `magi-gemini-analyzer` — or a direct
  switch with no parallel period.
* Whether `gemini_pattern_analysis` is dropped or kept read-only after
  cutover.
* Whether any finding may ever be injected into PLM prompts (default in this
  proposal: no).
* Cost ceiling. Public list price is $2 input / $10 output per 1M tokens
  (vendor, 2026-10); measure real per-run cost during the parallel run.

# Unverified at time of writing

* magi-core was not readable from this session (private repo), so the
  current `magi-gemini-analyzer` implementation, the Kimi secret name and the
  configured `kimi-k2.6` id were not checked against code.
* `kimi-k3.1-pro` capability claims (e.g. OfficeQA Pro v2 64.4) are
  vendor-reported finance-document benchmarks, not measurements on MAGI's
  `trades × thoughts` task.

# Citations

* Decision: Jun, 2026-11-09 Claude session (option "merge with the MELCHIOR
  analyzer").
* Spec base: magi-knowledge `edb23afca93ddba9fb486351c35d462b8d73c12f`.
