---
type: Service
title: magi-core
description: The MAGI trading engine — trade loop, LLM orchestration, and guard layers.
lilith_safe: false
tags: [service, magi-core, core, trading]
repo: dogmaai/magi-core
---

# Overview

magi-core is the heart of MAGI: it runs trading sessions, orchestrates the
[PLM units](/system/plm-units/), enforces the [guard layers](/system/guards/),
and writes the core ECHIDNA tables.

# Key modules

| Module | Responsibility |
|---|---|
| `src/session.js` / `magi-core.js` | Session lifecycle, unit personas. |
| `src/llm.js` | LLM call orchestration + guard pipeline (L-1…L7). |
| `src/paperGuards.js` | L4 / L5 / L7 guard implementations. |
| `src/positionMgmt.js` / `positionManager.js` | Position management + L0 guard. |
| `src/hermes.js` | HERMES intelligence. |
| `lib/vix.js` | VIX regime detection (L6, hard gate). |
| `lib/config.js` | Unit/model mapping + budget weights. |
| `lib/bigquery.js` | ECHIDNA writers (`safeInsert`, validators). |
| `lib/constitution.js` | Constitution prompt builder. |

# Offline analysis jobs

Cloud Run jobs and their Cloud Scheduler wrappers (separate resources with
separate names) as defined in `magi-core/.github/workflows/deploy.yml`:

| Cloud Run Job | Scheduler | Schedule (TZ) | Role |
|---|---|---|---|
| `magi-fugu-analyzer` | `magi-fugu-analyzer-daily` | `30 23 * * 1,5` (America/New_York) | [SEKHMET](/system/plm-units/sekhmet.md) offline sequential / **causal** outcome analysis, Sakana `fugu-ultra`, `reasoning_effort=high` → [fugu-sequential-patterns](/system/echidna-tables/fugu-sequential-patterns.md) |
| `magi-gemini-analyzer` | `magi-gemini-analyzer-daily` | `0 14 * * 1-5` (UTC) | Gemini **generic** WIN/LOSE pattern analysis (AI Studio `gemini-3.8-flash`); not causal analysis → [gemini-pattern-analysis](/system/echidna-tables/gemini-pattern-analysis.md) |
| `magi-daphne-analyzer` | `magi-daphne-analyzer-daily` | `0 22 * * 1-5` (America/New_York) | LP-taxonomy classification of LOSE trades in BigQuery SQL + static `IS_CAUSAL` flag → [daphne-feedback](/system/echidna-tables/daphne-feedback.md) |
| `magi-thought-outcome-analyzer` | `magi-thought-outcome-analyzer-daily` | `0 23 * * 1-5` (America/New_York) | Links thoughts to realized outcomes (feeds the Fugu pass that follows at 23:30 ET) |
| `magi-thought-quality-ranker` | `magi-thought-quality-ranker` | `0 0 1,15 * *` (UTC) | Semi-monthly thought quality ranking (`SAKANA_MODEL=fugu-ultra`) → [thought-quality-scores](/system/echidna-tables/thought-quality-scores.md) |
| `magi-evaluator` | — (invoked by the trade pipeline) | — | Trade outcome evaluation |

Role boundaries: see
[causal analysis ownership](/system/plm-units/index.md#causal-analysis-ownership).

# Writes

[trades](/system/echidna-tables/trades.md),
[thoughts](/system/echidna-tables/thoughts.md),
[sessions](/system/echidna-tables/sessions.md),
[llm-metrics](/system/echidna-tables/llm-metrics.md),
[consensus-signals](/system/echidna-tables/consensus-signals.md), guard_blocks,
[lilith-hard-gate-events](/system/echidna-tables/lilith-hard-gate-events.md).

# Depends on

[magi-moomoo](magi-moomoo.md) (broker), [magi-isabel](magi-isabel.md) (patterns),
Cohere (embeddings).
